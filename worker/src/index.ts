export { RoomDurableObject } from './RoomDurableObject';

export interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
  MAX_ROOM_USERS: string;
  ROOM_TTL_HOURS: string;
  IDLE_TIMEOUT_MINS: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // WebSocket: /room/:roomId
    if (url.pathname.startsWith('/room/')) {
      const roomId = url.pathname.split('/room/')[1];
      if (!roomId) {
        return json({ error: 'Missing room ID' }, 400);
      }

      const durableId = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(durableId);
      return stub.fetch(request);
    }

    // REST: /api/scenes/save
    if (url.pathname === '/api/scenes/save' && request.method === 'POST') {
      return handleSceneSave(request, env);
    }

    // REST: /api/scenes/load
    if (url.pathname === '/api/scenes/load' && request.method === 'GET') {
      return handleSceneLoad(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return json({ error: 'Not found' }, 404);
  },
};

// --- REST Handlers ---

async function handleSceneSave(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      sessionId: string;
      encryptedData: string;
      permission?: string;
      workspaceName?: string;
      createdBy?: string;
    };

    if (!body.sessionId || !body.encryptedData) {
      return json({ error: 'Missing sessionId or encryptedData' }, 400);
    }

    const sceneId = crypto.randomUUID();
    const token = generateToken();
    const permissionId = crypto.randomUUID();
    const sizeBytes = new Blob([body.encryptedData]).size;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO scenes (id, session_id, workspace_name, encrypted_data, permission, created_by, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        sceneId,
        body.sessionId,
        body.workspaceName || 'Untitled',
        body.encryptedData,
        body.permission || 'view',
        body.createdBy || null,
        sizeBytes
      ),
      env.DB.prepare(
        `INSERT INTO scene_permissions (id, scene_id, token, permission)
         VALUES (?, ?, ?, ?)`
      ).bind(
        permissionId,
        sceneId,
        token,
        body.permission || 'view'
      ),
    ]);

    return json({ sceneId, token }, 201);
  } catch (err) {
    return json({ error: 'Failed to save scene' }, 500);
  }
}

async function handleSceneLoad(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return json({ error: 'Missing token' }, 400);
    }

    const perm = await env.DB.prepare(
      `SELECT sp.permission, s.encrypted_data, s.workspace_name, s.session_id
       FROM scene_permissions sp
       JOIN scenes s ON sp.scene_id = s.id
       WHERE sp.token = ?`
    ).bind(token).first<{
      permission: string;
      encrypted_data: string;
      workspace_name: string;
      session_id: string;
    }>();

    if (!perm) {
      return json({ error: 'Scene not found or link expired' }, 404);
    }

    // Increment view count
    await env.DB.prepare(
      `UPDATE scenes SET view_count = view_count + 1
       WHERE session_id = ?`
    ).bind(perm.session_id).run();

    return json({
      encryptedData: perm.encrypted_data,
      permission: perm.permission,
      workspaceName: perm.workspace_name,
    });
  } catch (err) {
    return json({ error: 'Failed to load scene' }, 500);
  }
}

// --- Helpers ---

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}
