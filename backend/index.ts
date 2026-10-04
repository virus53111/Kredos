import { db, error, json, requireAuth, router } from '@appdeploy/sdk';

type Role = 'renter' | 'host';
interface Profile {
  role: Role;
  referralCode: string;
  email: string;
  createdAt: string;
}
interface Device {
  model: string;
  country: string;
  androidVersion: string;
  carrier: string;
  network: string;
  status: 'pending';
  hourlyRate: number;
  hostRate: number;
  createdAt: string;
}

const profileTable = (userId: string) => 'profiles_' + userId;
const deviceTable = (userId: string) => 'devices_' + userId;
const makeCode = () =>
  crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();

async function getProfile(
  userId: string
): Promise<(Profile & { id: string }) | null> {
  const { items } = await db.list<Profile>(profileTable(userId), { limit: 1 });
  return items[0] || null;
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
        referralCode: makeCode(),
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
      return json({ devices: items });
    },
  ],
  'POST /api/devices': [
    requireAuth(),
    async ctx => {
      const profile = await getProfile(ctx.user!.userId);
      if (!profile || profile.role !== 'host') return error('host_only', 403);
      const b = (ctx.body || {}) as Record<string, unknown>;
      const model = String(b.model || '')
        .trim()
        .slice(0, 80);
      const country = String(b.country || '')
        .trim()
        .slice(0, 60);
      const androidVersion = String(b.androidVersion || '')
        .trim()
        .slice(0, 30);
      const carrier = String(b.carrier || '')
        .trim()
        .slice(0, 60);
      const network = String(b.network || '')
        .trim()
        .slice(0, 20);
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
      return json({ device: { id, ...record } }, 201);
    },
  ],
});
