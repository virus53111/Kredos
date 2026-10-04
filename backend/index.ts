import { db, error, json, requireAuth, router } from '@appdeploy/sdk';

type Role = 'renter' | 'host';
type ConnectionStatus = 'pending' | 'online' | 'offline';

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
  status: 'pending' | 'paired';
  hourlyRate: number;
  hostRate: number;
  createdAt: string;
  bridgeKey?: string;
  catalogId?: string;
  pairedAt?: string;
  agentId?: string;
  lastSeenAt?: string;
  lastAgentInfo?: AgentInfo;
}

interface CatalogDevice {
  ownerId: string;
  ownerDeviceId: string;
  model: string;
  country: string;
  androidVersion: string;
  carrier: string;
  network: string;
  hourlyRate: number;
  bridgeKey: string;
  createdAt: string;
}

interface AgentStatus {
  connectionStatus: ConnectionStatus;
  lastSeenAt?: string | null;
  agentInfo?: AgentInfo | null;
}

const AGENT_API = 'https://phonebridge-agent-api.onrender.com';
const CATALOG_TABLE = 'catalog_devices';
const profileTable = (userId: string) => 'profiles_' + userId;
const deviceTable = (userId: string) => 'devices_' + userId;

const makeReferralCode = () =>
  crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

const makeBridgeKey = () =>
  crypto.randomUUID().replace(/-/g, '') +
  crypto.randomUUID().replace(/-/g, '');

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

async function agentRequest<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const response = await fetch(AGENT_API + path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text || 'invalid_agent_response' };
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' &&
      data !== null &&
      'error' in data &&
      typeof (data as { error?: unknown }).error === 'string'
        ? String((data as { error: string }).error)
        : 'agent_api_error';
    throw new Error(message);
  }

  return data as T;
}

function safeOwnedDevice(
  device: Device & { id: string },
  status?: AgentStatus
) {
  const {
    bridgeKey: _bridgeKey,
    catalogId: _catalogId,
    ...safe
  } = device;

  return {
    ...safe,
    connectionStatus:
      status?.connectionStatus ||
      (device.status === 'paired' ? 'offline' : 'pending'),
    lastSeenAt: status?.lastSeenAt || device.lastSeenAt || null,
    lastAgentInfo: status?.agentInfo || device.lastAgentInfo || null,
  };
}

function safeCatalogDevice(
  item: CatalogDevice & { id: string },
  status: AgentStatus
) {
  const { bridgeKey: _bridgeKey, ownerId: _ownerId, ...safe } = item;
  return {
    ...safe,
    connectionStatus: status.connectionStatus,
    lastSeenAt: status.lastSeenAt || null,
    available: status.connectionStatus === 'online',
  };
}

async function ensureCatalogDevice(
  ownerId: string,
  device: Device & { id: string }
): Promise<Device & { id: string }> {
  let next: Device & { id: string } = device;

  if (!next.bridgeKey) {
    next = {
      ...next,
      bridgeKey: makeBridgeKey(),
    };
  }

  if (!next.catalogId) {
    const catalogRecord: CatalogDevice = {
      ownerId,
      ownerDeviceId: next.id,
      model: next.model,
      country: next.country,
      androidVersion: next.androidVersion,
      carrier: next.carrier,
      network: next.network,
      hourlyRate: next.hourlyRate,
      bridgeKey: next.bridgeKey!,
      createdAt: next.createdAt,
    };
    const [catalogId] = await db.add(CATALOG_TABLE, [catalogRecord]);
    if (!catalogId) throw new Error('catalog_create_failed');
    next = {
      ...next,
      catalogId,
    };
  }

  if (
    next.bridgeKey !== device.bridgeKey ||
    next.catalogId !== device.catalogId
  ) {
    const { id, ...record } = next;
    const [updated] = await db.update(deviceTable(ownerId), [
      {
        id,
        record,
      },
    ]);
    if (!updated) throw new Error('device_catalog_sync_failed');
  }

  return next;
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  'GET /api/catalog': [
    async () => {
      const { items } = await db.list<CatalogDevice>(CATALOG_TABLE, {
        limit: 100,
      });

      const catalog = await Promise.all(
        items.map(async item => {
          try {
            const status = await agentRequest<AgentStatus>('/status', {
              deviceId: item.ownerDeviceId,
              deviceKey: item.bridgeKey,
            });
            return safeCatalogDevice(item, status);
          } catch {
            return safeCatalogDevice(item, {
              connectionStatus: 'offline',
              lastSeenAt: null,
            });
          }
        })
      );

      return json({
        devices: catalog
          .filter(device => device.connectionStatus !== 'pending')
          .sort((a, b) => {
            if (a.available === b.available) return 0;
            return a.available ? -1 : 1;
          }),
      });
    },
  ],

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

      const devices = await Promise.all(
        items.map(async original => {
          let device = original as Device & { id: string };

          try {
            device = await ensureCatalogDevice(ctx.user!.userId, device);
          } catch {
            // Keep the owner dashboard usable even if catalog sync fails.
          }

          if (!device.bridgeKey) {
            return safeOwnedDevice(device);
          }

          try {
            const status = await agentRequest<AgentStatus>('/status', {
              deviceId: device.id,
              deviceKey: device.bridgeKey,
            });
            return safeOwnedDevice(device, status);
          } catch {
            return safeOwnedDevice(device, {
              connectionStatus:
                device.status === 'paired' ? 'offline' : 'pending',
              lastSeenAt: device.lastSeenAt || null,
            });
          }
        })
      );

      return json({ devices });
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
        bridgeKey: makeBridgeKey(),
      };

      const [id] = await db.add(deviceTable(ctx.user!.userId), [record]);
      if (!id) return error('device_create_failed', 500);

      let device = { id, ...record };
      try {
        device = await ensureCatalogDevice(ctx.user!.userId, device);
      } catch {
        // GET /api/devices retries catalog synchronization later.
      }

      return json({
        device: safeOwnedDevice(device),
      }, 201);
    },
  ],

  'POST /api/devices/:id/pair': [
    requireAuth(),
    async ctx => {
      const profile = await getProfile(ctx.user!.userId);
      if (!profile || profile.role !== 'host') return error('host_only', 403);

      const existing = await getOwnedDevice(ctx.user!.userId, ctx.params.id);
      if (!existing) return error('device_not_found', 404);

      try {
        const device = await ensureCatalogDevice(ctx.user!.userId, {
          id: ctx.params.id,
          ...existing,
        });

        const pairing = await agentRequest<{
          pairingString: string;
          expiresAt: string;
        }>('/pair', {
          deviceId: ctx.params.id,
          deviceKey: device.bridgeKey!,
        });

        return json({
          pairing: {
            pairingId: 'render',
            code: '',
            pairingString: pairing.pairingString,
            expiresAt: pairing.expiresAt,
          },
        });
      } catch {
        return error('agent_api_unavailable', 502);
      }
    },
  ],
});
