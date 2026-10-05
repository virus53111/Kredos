import http from 'node:http';
import crypto from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';

const PORT = Number(process.env.PORT || 10000);
const SECRET = process.env.PB_AGENT_SECRET || crypto.randomBytes(32).toString('hex');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://phonebridge-zfvppo.v2.appdeploy.ai';

if (!process.env.PB_AGENT_SECRET) {
  console.warn('PB_AGENT_SECRET is not set; using an ephemeral Stage 4 signing key');
}

const lastSeen = new Map();
const usedPairings = new Set();
const reservations = new Map();
const agentSockets = new Map();
const viewerSockets = new Map();

function closeSessionSockets(sessionId, reason) {
  const agentSocket = agentSockets.get(sessionId);
  if (agentSocket) {
    agentSocket.close(1000, reason);
    agentSockets.delete(sessionId);
  }

  const viewerSocket = viewerSockets.get(sessionId);
  if (viewerSocket) {
    viewerSocket.close(1000, reason);
    viewerSockets.delete(sessionId);
  }
}

function getActiveReservation(deviceId) {
  const current = reservations.get(deviceId);
  if (!current) return null;

  if (
    current.expiresAt &&
    Date.now() >= current.expiresAt
  ) {
    reservations.delete(deviceId);
    closeSessionSockets(
      current.sessionId,
      'rental_expired'
    );
    console.log(
      '[expire]',
      deviceId,
      current.sessionId
    );
    return null;
  }

  return current;
}

function b64url(input) {
  return Buffer.from(input).toString('base64url');
}

function fromB64url(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function sign(data) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
}

function makeToken(payload) {
  const body = b64url(JSON.stringify(payload));
  return body + '.' + sign(body);
}

function verifyToken(token, expectedType) {
  if (typeof token !== 'string') throw new Error('invalid_token');
  const dot = token.lastIndexOf('.');
  if (dot <= 0) throw new Error('invalid_token');
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('invalid_signature');
  }
  const payload = JSON.parse(fromB64url(body));
  if (payload.typ !== expectedType) throw new Error('invalid_type');
  if (payload.exp && Date.now() > payload.exp) throw new Error('expired');
  return payload;
}

function hashKey(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function randomId() {
  return crypto.randomUUID();
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'cache-control': 'no-store'
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 64 * 1024) reject(new Error('body_too_large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('invalid_json'));
      }
    });
    req.on('error', reject);
  });
}

function cleanInfo(info) {
  const src = info && typeof info === 'object' ? info : {};
  return {
    manufacturer: String(src.manufacturer || '').slice(0, 80),
    model: String(src.model || '').slice(0, 80),
    androidVersion: String(src.androidVersion || '').slice(0, 40),
    appVersion: String(src.appVersion || '').slice(0, 30)
  };
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': ALLOWED_ORIGIN,
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'GET,POST,OPTIONS'
    });
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, service: 'phonebridge-agent-api' });
  }

  if (req.method === 'POST' && req.url === '/pair') {
    const body = await readJson(req);
    const deviceId = String(body.deviceId || '').trim();
    const deviceKey = String(body.deviceKey || '').trim();
    if (!deviceId || deviceKey.length < 32) {
      return json(res, 400, { error: 'invalid_device' });
    }

    const now = Date.now();
    const payload = {
      typ: 'pair',
      jti: randomId(),
      deviceId,
      keyHash: hashKey(deviceKey),
      iat: now,
      exp: now + 10 * 60_000
    };
    return json(res, 200, {
      pairingString: makeToken(payload),
      expiresAt: new Date(payload.exp).toISOString()
    });
  }

  if (req.method === 'POST' && req.url === '/claim') {
    const body = await readJson(req);
    let pairing;
    try {
      pairing = verifyToken(String(body.pairingString || ''), 'pair');
    } catch (error) {
      const code = error.message === 'expired' ? 410 : 403;
      return json(res, code, { error: error.message });
    }

    if (usedPairings.has(pairing.jti)) {
      return json(res, 409, { error: 'pairing_used' });
    }
    usedPairings.add(pairing.jti);

    const agentId = randomId();
    const now = Date.now();
    const agentToken = makeToken({
      typ: 'agent',
      agentId,
      deviceId: pairing.deviceId,
      keyHash: pairing.keyHash,
      iat: now,
      exp: now + 365 * 24 * 60 * 60_000
    });

    lastSeen.set(pairing.deviceId, {
      ts: now,
      keyHash: pairing.keyHash,
      agentId,
      agentInfo: cleanInfo(body.agentInfo)
    });
    console.log('[claim]', pairing.deviceId, cleanInfo(body.agentInfo));

    return json(res, 200, {
      agentId,
      deviceToken: agentToken,
      heartbeatSeconds: 60
    });
  }

  if (req.method === 'POST' && req.url === '/heartbeat') {
    const body = await readJson(req);
    let agent;
    try {
      agent = verifyToken(String(body.deviceToken || ''), 'agent');
    } catch (error) {
      return json(res, 401, { error: error.message });
    }

    if (String(body.agentId || '') !== agent.agentId) {
      return json(res, 401, { error: 'agent_id_mismatch' });
    }

    const now = Date.now();
    lastSeen.set(agent.deviceId, {
      ts: now,
      keyHash: agent.keyHash,
      agentId: agent.agentId,
      agentInfo: cleanInfo(body.agentInfo)
    });
    console.log('[heartbeat]', agent.deviceId, cleanInfo(body.agentInfo));

    return json(res, 200, {
      ok: true,
      serverTime: new Date(now).toISOString(),
      heartbeatSeconds: 60
    });
  }

  if (req.method === 'POST' && req.url === '/reserve') {
    const body = await readJson(req);
    const deviceId = String(body.deviceId || '').trim();
    const deviceKey = String(body.deviceKey || '').trim();
    const renterId = String(body.renterId || '').trim();
    const maxSeconds = Math.floor(
      Number(body.maxSeconds || 0)
    );

    if (
      !deviceId ||
      deviceKey.length < 32 ||
      !renterId ||
      !Number.isFinite(maxSeconds) ||
      maxSeconds < 60 ||
      maxSeconds > 24 * 60 * 60
    ) {
      return json(res, 400, { error: 'invalid_reservation' });
    }

    const state = lastSeen.get(deviceId);
    if (!state || state.keyHash !== hashKey(deviceKey)) {
      return json(res, 409, { error: 'device_not_ready' });
    }

    if (Date.now() - state.ts > 120_000) {
      return json(res, 409, { error: 'device_offline' });
    }

    const existing = getActiveReservation(deviceId);
    if (existing) {
      return json(res, 409, { error: 'device_busy' });
    }

    const sessionId = randomId();
    const startedAt = Date.now();
    const expiresAt =
      startedAt + maxSeconds * 1000;
    const viewerToken = makeToken({
      typ: 'viewer',
      sessionId,
      deviceId,
      iat: startedAt,
      exp: expiresAt
    });

    reservations.set(deviceId, {
      sessionId,
      renterId,
      keyHash: hashKey(deviceKey),
      startedAt,
      expiresAt,
      viewerToken
    });

    console.log('[reserve]', deviceId, sessionId);

    return json(res, 200, {
      sessionId,
      startedAt: new Date(startedAt).toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      viewerToken
    });
  }

  if (req.method === 'POST' && req.url === '/release') {
    const body = await readJson(req);
    const deviceId = String(body.deviceId || '').trim();
    const deviceKey = String(body.deviceKey || '').trim();
    const sessionId = String(body.sessionId || '').trim();

    if (!deviceId || deviceKey.length < 32 || !sessionId) {
      return json(res, 400, { error: 'invalid_release' });
    }

    const current = getActiveReservation(deviceId);
    if (!current) {
      return json(res, 200, { released: true });
    }

    if (
      current.sessionId !== sessionId ||
      current.keyHash !== hashKey(deviceKey)
    ) {
      return json(res, 403, { error: 'release_not_allowed' });
    }

    reservations.delete(deviceId);
    closeSessionSockets(
      sessionId,
      'rental_ended'
    );

    console.log('[release]', deviceId, sessionId);
    return json(res, 200, { released: true });
  }

  if (req.method === 'POST' && req.url === '/agent/session') {
    const body = await readJson(req);
    let agent;
    try {
      agent = verifyToken(String(body.deviceToken || ''), 'agent');
    } catch (error) {
      return json(res, 401, { error: error.message });
    }

    if (String(body.agentId || '') !== agent.agentId) {
      return json(res, 401, { error: 'agent_id_mismatch' });
    }

    const current = getActiveReservation(
      agent.deviceId
    );
    return json(res, 200, {
      active: Boolean(current),
      session: current
        ? {
            sessionId: current.sessionId,
            startedAt:
              new Date(
                current.startedAt
              ).toISOString(),
            expiresAt:
              new Date(
                current.expiresAt
              ).toISOString()
          }
        : null
    });
  }

  if (req.method === 'POST' && req.url === '/status') {
    const body = await readJson(req);
    const deviceId = String(body.deviceId || '').trim();
    const deviceKey = String(body.deviceKey || '').trim();
    if (!deviceId || deviceKey.length < 32) {
      return json(res, 400, { error: 'invalid_device' });
    }

    const state = lastSeen.get(deviceId);
    if (!state || state.keyHash !== hashKey(deviceKey)) {
      return json(res, 200, {
        connectionStatus: 'pending',
        lastSeenAt: null,
        agentInfo: null,
        busy: false,
        sessionId: null
      });
    }

    const online = Date.now() - state.ts <= 120_000;
    const current = getActiveReservation(
      deviceId
    );

    return json(res, 200, {
      connectionStatus: online ? 'online' : 'offline',
      lastSeenAt: new Date(state.ts).toISOString(),
      agentInfo: state.agentInfo,
      busy: Boolean(current),
      sessionId: current?.sessionId || null
    });
  }

  return json(res, 404, { error: 'not_found' });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(error => {
    console.error(error);
    json(res, 500, { error: 'server_error' });
  });
});

const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 2 * 1024 * 1024
});

server.on('upgrade', (req, socket, head) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');

    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }

    const role = url.searchParams.get('role');
    const token = url.searchParams.get('token') || '';

    if (role === 'viewer') {
      const viewer = verifyToken(token, 'viewer');
      const reservation =
        getActiveReservation(viewer.deviceId);

      if (
        !reservation ||
        reservation.sessionId !== viewer.sessionId
      ) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, ws => {
        wss.emit('connection', ws, req, {
          role: 'viewer',
          sessionId: viewer.sessionId,
          deviceId: viewer.deviceId
        });
      });
      return;
    }

    if (role === 'agent') {
      const agent = verifyToken(token, 'agent');
      const sessionId =
        String(url.searchParams.get('sessionId') || '');
      const reservation =
        getActiveReservation(agent.deviceId);

      if (
        !reservation ||
        reservation.sessionId !== sessionId
      ) {
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, ws => {
        wss.emit('connection', ws, req, {
          role: 'agent',
          sessionId,
          deviceId: agent.deviceId
        });
      });
      return;
    }

    socket.destroy();
  } catch {
    socket.destroy();
  }
});

wss.on('connection', (ws, _req, meta) => {
  const map =
    meta.role === 'agent'
      ? agentSockets
      : viewerSockets;

  const previous = map.get(meta.sessionId);
  if (previous && previous !== ws) {
    previous.close(1000, 'replaced');
  }
  map.set(meta.sessionId, ws);

  console.log(
    '[ws-connect]',
    meta.role,
    meta.deviceId,
    meta.sessionId
  );

  ws.on('message', (data, isBinary) => {
    if (meta.role === 'agent') {
      const viewer = viewerSockets.get(meta.sessionId);
      if (
        viewer &&
        viewer.readyState === WebSocket.OPEN
      ) {
        viewer.send(data, { binary: isBinary });
      }
      return;
    }

    const agent = agentSockets.get(meta.sessionId);
    if (
      agent &&
      agent.readyState === WebSocket.OPEN &&
      !isBinary
    ) {
      agent.send(data, { binary: false });
    }
  });

  ws.on('close', () => {
    if (map.get(meta.sessionId) === ws) {
      map.delete(meta.sessionId);
    }
    console.log(
      '[ws-close]',
      meta.role,
      meta.deviceId,
      meta.sessionId
    );
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('PhoneBridge Agent API listening on', PORT);
});
