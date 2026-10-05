import { db, error, json, requireAuth, router } from '@appdeploy/sdk';
import {
  getMoneyAccount,
  paymentRoutes,
  settleRentalBalances,
} from './payments';

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
  acceptingRentals?: boolean;
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
  acceptingRentals?: boolean;
}

interface AgentStatus {
  connectionStatus: ConnectionStatus;
  lastSeenAt?: string | null;
  agentInfo?: AgentInfo | null;
  busy?: boolean;
  sessionId?: string | null;
}

interface RentalSession {
  catalogId: string;
  ownerId: string;
  ownerDeviceId: string;
  model: string;
  country: string;
  hourlyRate: number;
  hostRate: number;
  renderSessionId: string;
  viewerToken: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
  billedSeconds?: number;
  totalAmount?: number;
  hostAmount?: number;
  selfTest: boolean;
  expiresAt?: string;
  settled?: boolean;
}

const AGENT_API = 'https://phonebridge-agent-api.onrender.com';
const CATALOG_TABLE = 'catalog_devices';
const profileTable = (userId: string) => 'profiles_' + userId;
const deviceTable = (userId: string) => 'devices_' + userId;
const rentalTable = (userId: string) => 'rentals_' + userId;

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
    busy: Boolean(status.busy),
    hostAvailable: item.acceptingRentals !== false,
    available:
      status.connectionStatus === 'online' &&
      !status.busy &&
      item.acceptingRentals !== false,
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
      acceptingRentals: next.acceptingRentals !== false,
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

async function finishRental(
  renterId: string,
  rentalId: string,
  session: RentalSession
): Promise<RentalSession> {
  if (
    session.status === 'ended' &&
    session.settled
  ) {
    return session;
  }

  const [catalogItem] =
    await db.get<CatalogDevice>(
      CATALOG_TABLE,
      [session.catalogId]
    );

  if (catalogItem) {
    try {
      await agentRequest('/release', {
        deviceId: session.ownerDeviceId,
        deviceKey: catalogItem.bridgeKey,
        sessionId: session.renderSessionId,
      });
    } catch {
      // Billing and local session close must not depend on Render release.
    }
  }

  const now = Date.now();
  const expiry = session.expiresAt
    ? Date.parse(session.expiresAt)
    : now;
  const effectiveEnd =
    session.expiresAt
      ? Math.min(now, expiry)
      : now;
  const endedAt =
    new Date(effectiveEnd).toISOString();

  const billedSeconds = Math.max(
    1,
    Math.ceil(
      (
        effectiveEnd -
        Date.parse(session.startedAt)
      ) / 1000
    )
  );

  const rawTotal =
    (billedSeconds / 3600) *
    session.hourlyRate;
  const rawHost =
    (billedSeconds / 3600) *
    session.hostRate;

  const totalAmount =
    session.selfTest
      ? 0
      : Number(rawTotal.toFixed(6));
  const hostAmount =
    session.selfTest
      ? 0
      : Number(rawHost.toFixed(6));

  if (!session.selfTest) {
    await settleRentalBalances(
      rentalId,
      renterId,
      session.ownerId,
      Math.round(totalAmount * 1_000_000),
      Math.round(hostAmount * 1_000_000)
    );
  }

  const updated: RentalSession = {
    ...session,
    status: 'ended',
    endedAt,
    billedSeconds,
    totalAmount,
    hostAmount,
    settled: true,
  };

  const [ok] = await db.update(
    rentalTable(renterId),
    [
      {
        id: rentalId,
        record: updated,
      },
    ]
  );

  if (!ok) {
    throw new Error('rental_end_failed');
  }

  return updated;
}

export const handler = router({
  ...paymentRoutes,

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

  'POST /api/rentals/start': [
    requireAuth(),
    async ctx => {
      const body = (ctx.body || {}) as { catalogId?: string };
      const catalogId = String(body.catalogId || '').trim();
      if (!catalogId) return error('catalog_id_required', 400);

      const { items: existingSessions } =
        await db.list<RentalSession>(
          rentalTable(ctx.user!.userId),
          { limit: 20 }
        );
      if (
        existingSessions.some(
          session => session.status === 'active'
        )
      ) {
        return error('rental_already_active', 409);
      }

      const [item] = await db.get<CatalogDevice>(
        CATALOG_TABLE,
        [catalogId]
      );
      if (!item) return error('catalog_device_not_found', 404);
      if (item.acceptingRentals === false) {
        return error('device_not_accepting_rentals', 409);
      }

      const selfTest =
        item.ownerId === ctx.user!.userId;
      let maxSeconds = 24 * 60 * 60;

      if (!selfTest) {
        const account = await getMoneyAccount(
          ctx.user!.userId
        );
        const hourlyMicros = Math.max(
          1,
          Math.round(
            item.hourlyRate * 1_000_000
          )
        );

        const minimumMicros = Math.ceil(
          hourlyMicros / 60
        );

        if (
          account.renterBalanceMicros <
          minimumMicros
        ) {
          return error(
            'insufficient_balance',
            402
          );
        }

        maxSeconds = Math.max(
          60,
          Math.min(
            24 * 60 * 60,
            Math.floor(
              (
                account.renterBalanceMicros /
                hourlyMicros
              ) * 3600
            )
          )
        );
      }

      let status: AgentStatus;
      try {
        status = await agentRequest<AgentStatus>('/status', {
          deviceId: item.ownerDeviceId,
          deviceKey: item.bridgeKey,
        });
      } catch {
        return error('agent_api_unavailable', 502);
      }

      if (status.connectionStatus !== 'online') {
        return error('device_offline', 409);
      }
      if (status.busy) {
        return error('device_busy', 409);
      }

      let reservation: {
        sessionId: string;
        startedAt: string;
        viewerToken: string;
        expiresAt: string;
      };

      try {
        reservation = await agentRequest('/reserve', {
          deviceId: item.ownerDeviceId,
          deviceKey: item.bridgeKey,
          renterId: ctx.user!.userId,
          maxSeconds,
        });
      } catch (reserveError) {
        const message =
          reserveError instanceof Error
            ? reserveError.message
            : 'device_busy';
        return error(message, 409);
      }

      const record: RentalSession = {
        catalogId,
        ownerId: item.ownerId,
        ownerDeviceId: item.ownerDeviceId,
        model: item.model,
        country: item.country,
        hourlyRate: item.hourlyRate,
        hostRate: 0.5,
        renderSessionId: reservation.sessionId,
        viewerToken: reservation.viewerToken,
        status: 'active',
        startedAt: reservation.startedAt,
        expiresAt: reservation.expiresAt,
        selfTest,
        settled: false,
      };

      const [id] = await db.add(
        rentalTable(ctx.user!.userId),
        [record]
      );

      if (!id) {
        try {
          await agentRequest('/release', {
            deviceId: item.ownerDeviceId,
            deviceKey: item.bridgeKey,
            sessionId: reservation.sessionId,
          });
        } catch {
          // Reservation will be cleared by a later retry or service restart.
        }
        return error('rental_create_failed', 500);
      }

      return json({
        session: {
          id,
          ...record,
          billingMode: selfTest ? 'self_test' : 'metered',
        },
      }, 201);
    },
  ],

  'GET /api/rentals/active': [
    requireAuth(),
    async ctx => {
      const { items } = await db.list<RentalSession>(
        rentalTable(ctx.user!.userId),
        { limit: 50 }
      );

      const active = items
        .filter(item => item.status === 'active')
        .sort(
          (a, b) =>
            Date.parse(b.startedAt) -
            Date.parse(a.startedAt)
        );

      for (const session of active) {
        if (
          session.expiresAt &&
          Date.now() >=
            Date.parse(session.expiresAt)
        ) {
          await finishRental(
            ctx.user!.userId,
            session.id,
            session
          );
        }
      }

      const { items: refreshed } =
        await db.list<RentalSession>(
          rentalTable(ctx.user!.userId),
          { limit: 50 }
        );

      const sessions = refreshed
        .filter(
          item => item.status === 'active'
        )
        .sort(
          (a, b) =>
            Date.parse(b.startedAt) -
            Date.parse(a.startedAt)
        );

      return json({ sessions });
    },
  ],

  'POST /api/rentals/:id/end': [
    requireAuth(),
    async ctx => {
      const [session] =
        await db.get<RentalSession>(
          rentalTable(ctx.user!.userId),
          [ctx.params.id]
        );

      if (!session) {
        return error('rental_not_found', 404);
      }

      if (
        session.status === 'ended' &&
        session.settled
      ) {
        return json({
          session: {
            id: ctx.params.id,
            ...session,
          },
        });
      }

      try {
        const updated = await finishRental(
          ctx.user!.userId,
          ctx.params.id,
          session
        );

        return json({
          session: {
            id: ctx.params.id,
            ...updated,
          },
        });
      } catch (finishError) {
        const message =
          finishError instanceof Error
            ? finishError.message
            : 'rental_end_failed';
        return error(message, 409);
      }
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
        acceptingRentals: true,
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

  'POST /api/devices/:id/availability': [
    requireAuth(),
    async ctx => {
      const profile = await getProfile(ctx.user!.userId);
      if (!profile || profile.role !== 'host') return error('host_only', 403);

      const existing = await getOwnedDevice(ctx.user!.userId, ctx.params.id);
      if (!existing) return error('device_not_found', 404);

      const body = (ctx.body || {}) as { available?: unknown };
      if (typeof body.available !== 'boolean') {
        return error('invalid_availability', 400);
      }

      const device = await ensureCatalogDevice(ctx.user!.userId, {
        id: ctx.params.id,
        ...existing,
      });

      const { id, ...currentRecord } = device;
      const updatedRecord: Device = {
        ...currentRecord,
        acceptingRentals: body.available,
      };

      const [deviceUpdated] = await db.update(
        deviceTable(ctx.user!.userId),
        [{ id, record: updatedRecord }]
      );
      if (!deviceUpdated) return error('availability_update_failed', 500);

      if (device.catalogId) {
        const [catalog] = await db.get<CatalogDevice>(
          CATALOG_TABLE,
          [device.catalogId]
        );
        if (catalog) {
          await db.update(CATALOG_TABLE, [
            {
              id: device.catalogId,
              record: {
                ...catalog,
                acceptingRentals: body.available,
              },
            },
          ]);
        }
      }

      return json({
        device: safeOwnedDevice({
          id,
          ...updatedRecord,
        }),
      });
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

  'DELETE /api/devices/:id': [
    requireAuth(),
    async ctx => {
      const profile = await getProfile(ctx.user!.userId);
      if (!profile || profile.role !== 'host') return error('host_only', 403);

      const existing = await getOwnedDevice(ctx.user!.userId, ctx.params.id);
      if (!existing) return error('device_not_found', 404);

      let catalogIds: string[] = [];
      if (existing.catalogId) {
        catalogIds = [existing.catalogId];
      } else {
        const { items } = await db.list<CatalogDevice>(CATALOG_TABLE, {
          limit: 100,
        });
        catalogIds = items
          .filter(
            item =>
              item.ownerId === ctx.user!.userId &&
              item.ownerDeviceId === ctx.params.id
          )
          .map(item => item.id);
      }

      if (catalogIds.length) {
        await db.delete(CATALOG_TABLE, catalogIds);
      }

      const [deleted] = await db.delete(deviceTable(ctx.user!.userId), [
        ctx.params.id,
      ]);
      if (!deleted) return error('device_delete_failed', 500);

      return json({ deleted: true });
    },
  ],
});
