import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.PORT || 10000);
const SECRET = process.env.PB_AGENT_SECRET || crypto.randomBytes(32).toString('hex');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://phonebridge-zfvppo.v2.appdeploy.ai';

if (!process.env.PB_AGENT_SECRET) {
  console.warn('PB_AGENT_SECRET is not set; using an ephemeral Stage 4 signing key');
}

const lastSeen = new Map();
const usedPairings = new Set();

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

    return json(res, 200, {
      ok: true,
      serverTime: new Date(now).toISOString(),
      heartbeatSeconds: 60
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
        agentInfo: null
      });
    }

    const online = Date.now() - state.ts <= 120_000;
    return json(res, 200, {
      connectionStatus: online ? 'online' : 'offline',
      lastSeenAt: new Date(state.ts).toISOString(),
      agentInfo: state.agentInfo
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

server.listen(PORT, '0.0.0.0', () => {
  console.log('PhoneBridge Agent API listening on', PORT);
});
