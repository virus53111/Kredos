import { db, error, json, requireAuth, router } from '@appdeploy/sdk';

type Role = 'renter' | 'host';
type DeviceState = 'pending' | 'paired';

interface Profile {
  role: Role;
  referralCode: string;
  email: string;
  createdAt: string;
}

interface AgentInfo {
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  appVersion?: string;
}

interface Device {
  model: string;
  country: string;
  androidVersion: string;
  carrier: string;
  network: string;
  status: DeviceState;
  hourlyRate: number;
  hostRate: number;
  createdAt: string;
  pairedAt?: string;
  agentId?: string;
  lastSeenAt?: string;
  lastAgentInfo?: AgentInfo;
}

interface Pairing {
  ownerId: string;
  deviceId: string;
  code: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

interface Agent {
  ownerId: string;
  deviceId: string;
  tokenHash: string;
  createdAt: string;
  active: boolean;
}

const profileTable = (userId: string) => 'profiles_' + userId;
const deviceTable = (userId: string) => 'devices_' + userId;
const pairingTable = 'device_pairings';
const agentTable = 'device_agents';

const makeReferralCode = () =>
  crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

const makePairCode = () =>
  crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();

const makeDeviceToken = () =>
  crypto.randomUUID().replace(/-/g, '') +
  crypto.randomUUID().replace(/-/g, '');

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function getProfile(
  userId: string
): Promise<(Profile & { id: string }) | null> {
  const { items } = await db.list<Profile>(profileTable(userId), { limit: 1 });
  return items[0] || null;
}

async function getOwnedDevice(
  ownerId: string,
  deviceId: string
): Promise<Device | null> {
  const [device] = await db.get<Device>(deviceTable(ownerId), [deviceId]);
  return device;
}

function publicDevice(device: Device & { id: string }) {
  const lastSeen = device.lastSeenAt ? Date.parse(device.lastSeenAt) : 0;
  const online =
    device.status === 'paired' &&
    lastSeen > 0 &&
    Date.now() - lastSeen <= 120_000;

  return {
    ...device,
    connectionStatus:
      device.status === 'pending' ? 'pending' : online ? 'online' : 'offline',
  };
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  'GET /api/profile': [
    requireAuth(),
    async ctx => json({ profile: await getProfile(ctx.user!.userId) }),
  ],

  'POST /api/profile': [
    requireAuth(),
    async ctx => {
      const body = (ctx.body || {}) as { role?: string };
      if (body.role !== 'renter' && body.role !== 'host')
        return error('invalid_role', 400);

      const existing = await getProfile(ctx.user!.userId);
      if (existing) return json({ profile: existing });

      const record: Profile = {
        role: body.role,
        email: ctx.user!.email || '',
        referralCode: makeReferralCode(),
        createdAt: new Date().toISOString(),
      };
      const [id] = await db.add(profileTable(ctx.user!.userId), [record]);
      if (!id) return error('profile_create_failed', 500);
      return json({ profile: { id, ...record } }, 201);
    },
  ],

  'GET /api/devices': [
    requireAuth(),
    async ctx => {
      const profile = await getProfile(ctx.user!.userId);
      if (!profile || profile.role !== 'host') return json({ devices: [] });

      const { items } = await db.list<Device>(deviceTable(ctx.user!.userId), {
        limit: 100,
      });
      return json({ devices: items.map(publicDevice) });
    },
  ],

  'POST /api/devices': [
    requireAuth(),
    async ctx => {
      const profile = await getProfile(ctx.user!.userId);
      if (!profile || profile.role !== 'host') return error('host_only', 403);

      const body = (ctx.body || {}) as Record<string, unknown>;
      const model = String(body.model || '').trim().slice(0, 80);
      const country = String(body.country || '').trim().slice(0, 60);
      const androidVersion = String(body.androidVersion || '')
        .trim()
        .slice(0, 30);
      const carrier = String(body.carrier || '').trim().slice(0, 60);
      const network = String(body.network || '').trim().slice(0, 20);

      if (!model || !country || !androidVersion)
        return error('invalid_device', 400);
      if (!['5G', 'LTE', 'Wi-Fi'].includes(network))
        return error('invalid_network', 400);

      const record: Device = {
        model,
        country,
        androidVersion,
        carrier,
        network,
        status: 'pending',
        hourlyRate: 1,
        hostRate: 0.5,
        createdAt: new Date().toISOString(),
      };
      const [id] = await db.add(deviceTable(ctx.user!.userId), [record]);
      if (!id) return error('device_create_failed', 500);
      return json({ device: publicDevice({ id, ...record }) }, 201);
    },
  ],

  'POST /api/devices/:id/pair': [
    requireAuth(),
    async ctx => {
      const profile = await getProfile(ctx.user!.userId);
      if (!profile || profile.role !== 'host') return error('host_only', 403);

      const device = await getOwnedDevice(ctx.user!.userId, ctx.params.id);
      if (!device) return error('device_not_found', 404);
      if (device.status === 'paired') return error('already_paired', 409);

      const now = Date.now();
      const pairing: Pairing = {
        ownerId: ctx.user!.userId,
        deviceId: ctx.params.id,
        code: makePairCode(),
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 10 * 60_000).toISOString(),
      };
      const [pairingId] = await db.add(pairingTable, [pairing]);
      if (!pairingId) return error('pairing_create_failed', 500);

      return json({
        pairing: {
          pairingId,
          code: pairing.code,
          pairingString: pairingId + '.' + pairing.code,
          expiresAt: pairing.expiresAt,
        },
      });
    },
  ],

  'POST /api/agent/claim': [
    async ctx => {
      const body = (ctx.body || {}) as {
        pairingId?: string;
        code?: string;
        agentInfo?: AgentInfo;
      };
      const pairingId = String(body.pairingId || '').trim();
      const code = String(body.code || '').trim().toUpperCase();

      if (!pairingId || !code) return error('invalid_pairing', 400);

      const [pairing] = await db.get<Pairing>(pairingTable, [pairingId]);
      if (!pairing) return error('pairing_not_found', 404);
      if (pairing.usedAt) return error('pairing_used', 409);
      if (Date.parse(pairing.expiresAt) < Date.now())
        return error('pairing_expired', 410);
      if (pairing.code !== code) return error('pairing_code_invalid', 403);

      const device = await getOwnedDevice(pairing.ownerId, pairing.deviceId);
      if (!device) return error('device_not_found', 404);
      if (device.status === 'paired') return error('already_paired', 409);

      const token = makeDeviceToken();
      const agent: Agent = {
        ownerId: pairing.ownerId,
        deviceId: pairing.deviceId,
        tokenHash: await sha256(token),
        createdAt: new Date().toISOString(),
        active: true,
      };
      const [agentId] = await db.add(agentTable, [agent]);
      if (!agentId) return error('agent_create_failed', 500);

      const now = new Date().toISOString();
      const [deviceUpdated] = await db.update(deviceTable(pairing.ownerId), [
        {
          id: pairing.deviceId,
          record: {
            ...device,
            status: 'paired',
            pairedAt: now,
            agentId,
            lastSeenAt: now,
            lastAgentInfo: body.agentInfo || {},
          },
        },
      ]);
      if (!deviceUpdated) return error('device_update_failed', 500);

      const [pairingUpdated] = await db.update(pairingTable, [
        {
          id: pairingId,
          record: {
            ...pairing,
            usedAt: now,
          },
        },
      ]);
      if (!pairingUpdated) return error('pairing_update_failed', 500);

      return json({
        agentId,
        deviceToken: token,
        heartbeatSeconds: 60,
      });
    },
  ],

  'POST /api/agent/heartbeat': [
    async ctx => {
      const body = (ctx.body || {}) as {
        agentId?: string;
        deviceToken?: string;
        agentInfo?: AgentInfo;
      };
      const agentId = String(body.agentId || '').trim();
      const token = String(body.deviceToken || '').trim();
      if (!agentId || !token) return error('agent_auth_required', 401);

      const [agent] = await db.get<Agent>(agentTable, [agentId]);
      if (!agent || !agent.active) return error('agent_not_found', 401);
      if ((await sha256(token)) !== agent.tokenHash)
        return error('agent_token_invalid', 401);

      const device = await getOwnedDevice(agent.ownerId, agent.deviceId);
      if (!device) return error('device_not_found', 404);

      const now = new Date().toISOString();
      const [updated] = await db.update(deviceTable(agent.ownerId), [
        {
          id: agent.deviceId,
          record: {
            ...device,
            status: 'paired',
            lastSeenAt: now,
            lastAgentInfo: body.agentInfo || device.lastAgentInfo || {},
          },
        },
      ]);
      if (!updated) return error('heartbeat_update_failed', 500);

      return json({
        ok: true,
        serverTime: now,
        heartbeatSeconds: 60,
      });
    },
  ],
});
