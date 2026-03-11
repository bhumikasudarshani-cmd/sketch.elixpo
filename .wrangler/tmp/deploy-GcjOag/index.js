var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// worker/src/RoomDurableObject.ts
var CURSOR_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#98D8C8",
  "#F7DC6F",
  "#BB8FCE",
  "#F1948A"
];
var RoomDurableObject = class {
  static {
    __name(this, "RoomDurableObject");
  }
  state;
  env;
  sessions = /* @__PURE__ */ new Map();
  serverSeq = 0;
  roomState = null;
  lastActivityAt = Date.now();
  availableColors = [...CURSOR_COLORS];
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }
  async fetch(request) {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }
    const userId = url.searchParams.get("userId") || `guest-${crypto.randomUUID().slice(0, 8)}`;
    const displayName = decodeParam(url.searchParams.get("displayName") || "");
    const avatar = url.searchParams.get("avatar") || "";
    const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
    const roomId = url.pathname.split("/room/")[1];
    if (!this.roomState) {
      await this.initRoom(roomId, userId, clientIp);
    }
    if (this.roomState.status !== "active") {
      return new Response(JSON.stringify({ error: "ROOM_EXPIRED" }), {
        status: 410,
        headers: { "Content-Type": "application/json" }
      });
    }
    const maxUsers = parseInt(this.env.MAX_ROOM_USERS || "10");
    if (this.sessions.size >= maxUsers) {
      return new Response(JSON.stringify({ error: "ROOM_FULL" }), {
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }
    const isGuest = !url.searchParams.get("authToken");
    if (isGuest && this.sessions.size === 0) {
      const existingRoom = await this.env.KV.get(`ip-rooms:${clientIp}`);
      if (existingRoom && existingRoom !== roomId) {
        return new Response(JSON.stringify({ error: "ROOM_LIMIT_REACHED" }), {
          status: 429,
          headers: { "Content-Type": "application/json" }
        });
      }
      const ttlSeconds = parseInt(this.env.ROOM_TTL_HOURS || "3") * 3600;
      await this.env.KV.put(`ip-rooms:${clientIp}`, roomId, { expirationTtl: ttlSeconds });
    }
    const color = this.availableColors.shift() || CURSOR_COLORS[this.sessions.size % CURSOR_COLORS.length];
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    const userInfo = {
      userId,
      displayName: displayName || `User ${this.sessions.size + 1}`,
      avatar,
      color,
      joinedAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastActivity: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.state.acceptWebSocket(server);
    this.sessions.set(server, userInfo);
    this.sendTo(server, {
      type: "room-info",
      roomId,
      adminUserId: this.roomState.ownerId,
      expiresAt: this.roomState.expiresAt,
      yourColor: color,
      users: Array.from(this.sessions.values())
    });
    this.broadcast(server, {
      type: "join",
      from: userId,
      displayName: userInfo.displayName,
      avatar: userInfo.avatar,
      color,
      serverSeq: ++this.serverSeq
    });
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws, raw) {
    const user = this.sessions.get(ws);
    if (!user) return;
    let msg;
    try {
      msg = JSON.parse(typeof raw === "string" ? raw : new TextDecoder().decode(raw));
    } catch {
      this.sendTo(ws, { type: "error", code: "INVALID_MESSAGE" });
      return;
    }
    switch (msg.type) {
      case "op":
        this.lastActivityAt = Date.now();
        user.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
        this.broadcast(ws, {
          type: "op",
          from: user.userId,
          seq: msg.seq,
          serverSeq: ++this.serverSeq,
          payload: msg.payload
        });
        break;
      case "presence":
        this.broadcast(ws, {
          type: "presence",
          from: user.userId,
          cursor: msg.cursor,
          displayName: user.displayName,
          color: user.color
        });
        break;
      case "sync-request":
        for (const [otherWs, otherUser] of this.sessions) {
          if (otherWs !== ws) {
            this.sendTo(otherWs, {
              type: "sync-needed",
              requestedBy: user.userId,
              lastServerSeq: msg.lastServerSeq || 0
            });
            break;
          }
        }
        break;
      case "sync-response":
        for (const [otherWs, otherUser] of this.sessions) {
          if (otherUser.userId === msg.targetUserId) {
            this.sendTo(otherWs, {
              type: "sync-response",
              serverSeq: this.serverSeq,
              payload: msg.payload
            });
            break;
          }
        }
        break;
      case "ping":
        this.sendTo(ws, { type: "pong" });
        break;
      default:
        this.sendTo(ws, { type: "error", code: "INVALID_MESSAGE" });
    }
  }
  async webSocketClose(ws, code, reason) {
    this.handleDisconnect(ws);
  }
  async webSocketError(ws, error) {
    this.handleDisconnect(ws);
  }
  async alarm() {
    if (!this.roomState) return;
    const now = Date.now();
    const expiresAt = new Date(this.roomState.expiresAt).getTime();
    const idleTimeoutMs = parseInt(this.env.IDLE_TIMEOUT_MINS || "40") * 60 * 1e3;
    if (now >= expiresAt) {
      this.closeRoom("ROOM_EXPIRED");
      return;
    }
    if (now - this.lastActivityAt >= idleTimeoutMs && this.sessions.size > 0) {
      this.closeRoom("ROOM_IDLE_TIMEOUT");
      return;
    }
    const nextCheck = Math.min(5 * 60 * 1e3, expiresAt - now);
    this.state.storage.setAlarm(Date.now() + nextCheck);
  }
  // --- Private helpers ---
  async initRoom(roomId, ownerId, ownerIp) {
    const ttlHours = parseInt(this.env.ROOM_TTL_HOURS || "3");
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1e3);
    this.roomState = {
      ownerId,
      ownerIp,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "active"
    };
    try {
      await this.env.DB.prepare(
        `INSERT OR IGNORE INTO rooms (id, owner_user_id, owner_ip, created_at, expires_at, status)
         VALUES (?, ?, ?, ?, ?, 'active')`
      ).bind(roomId, ownerId, ownerIp, now.toISOString(), expiresAt.toISOString()).run();
    } catch {
    }
    const kvTtl = ttlHours * 3600;
    await this.env.KV.put(`room:${roomId}:state`, JSON.stringify(this.roomState), {
      expirationTtl: kvTtl
    });
    this.state.storage.setAlarm(Date.now() + 5 * 60 * 1e3);
  }
  handleDisconnect(ws) {
    const user = this.sessions.get(ws);
    if (!user) return;
    this.availableColors.push(user.color);
    this.sessions.delete(ws);
    this.broadcast(null, {
      type: "leave",
      from: user.userId,
      serverSeq: ++this.serverSeq
    });
  }
  closeRoom(reason) {
    for (const [ws] of this.sessions) {
      try {
        this.sendTo(ws, { type: "error", code: reason });
        ws.close(1e3, reason);
      } catch {
      }
    }
    this.sessions.clear();
    if (this.roomState) {
      this.roomState.status = "expired";
    }
  }
  broadcast(sender, message) {
    const data = JSON.stringify(message);
    for (const [ws] of this.sessions) {
      if (ws !== sender) {
        try {
          ws.send(data);
        } catch {
        }
      }
    }
  }
  sendTo(ws, message) {
    try {
      ws.send(JSON.stringify(message));
    } catch {
    }
  }
};
function decodeParam(value) {
  try {
    return atob(value);
  } catch {
    return decodeURIComponent(value);
  }
}
__name(decodeParam, "decodeParam");

// worker/src/index.ts
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
var index_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (url.pathname.startsWith("/room/")) {
      const roomId = url.pathname.split("/room/")[1];
      if (!roomId) {
        return json({ error: "Missing room ID" }, 400);
      }
      const durableId = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(durableId);
      return stub.fetch(request);
    }
    if (url.pathname === "/api/auth/callback" && request.method === "GET") {
      return handleAuthCallback(request, env);
    }
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return handleAuthMe(request, env);
    }
    if (url.pathname === "/api/auth/refresh" && request.method === "POST") {
      return handleAuthRefresh(request, env);
    }
    if (url.pathname === "/api/scenes/save" && request.method === "POST") {
      return handleSceneSave(request, env);
    }
    if (url.pathname === "/api/scenes/load" && request.method === "GET") {
      return handleSceneLoad(request, env);
    }
    if (url.pathname === "/api/images/sign" && request.method === "POST") {
      return handleImageSign(request, env);
    }
    if (url.pathname === "/health") {
      return json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
    }
    return json({ error: "Not found" }, 404);
  }
};
async function handleAuthCallback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) {
    return json({ error, error_description: url.searchParams.get("error_description") }, 400);
  }
  if (!code) {
    return json({ error: "Missing authorization code" }, 400);
  }
  const redirectUri = `${url.origin}/api/auth/callback`;
  const tokenRes = await fetch(`${env.ELIXPO_AUTH_URL}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: env.ELIXPO_CLIENT_ID,
      client_secret: env.ELIXPO_CLIENT_SECRET,
      redirect_uri: redirectUri
    })
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    return json({ error: "Token exchange failed", details: err }, 401);
  }
  const tokens = await tokenRes.json();
  const userRes = await fetch(`${env.ELIXPO_AUTH_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` }
  });
  if (!userRes.ok) {
    return json({ error: "Failed to fetch user profile" }, 401);
  }
  const profile = await userRes.json();
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const userAgent = request.headers.get("User-Agent") || "unknown";
  const locale = request.headers.get("Accept-Language")?.split(",")[0] || "unknown";
  const country = request.headers.get("CF-IPCountry") || "unknown";
  const timezone = request.headers.get("CF-Timezone") || "";
  await env.DB.prepare(
    `INSERT INTO users (id, email, display_name, avatar, provider, ip_address, user_agent, locale, country, timezone, login_count, last_login_at, created_at)
     VALUES (?, ?, ?, ?, 'elixpo', ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       avatar = excluded.avatar,
       ip_address = excluded.ip_address,
       user_agent = excluded.user_agent,
       locale = excluded.locale,
       country = excluded.country,
       timezone = excluded.timezone,
       login_count = login_count + 1,
       last_login_at = datetime('now')`
  ).bind(
    profile.id,
    profile.email,
    profile.displayName,
    profile.avatar,
    ip,
    userAgent,
    locale,
    country,
    timezone
  ).run();
  const sessionToken = generateToken(48);
  const sessionData = {
    userId: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatar: profile.avatar,
    isAdmin: profile.isAdmin,
    refreshToken: tokens.refresh_token
  };
  await env.KV.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
    expirationTtl: 86400
  });
  return json({
    sessionToken,
    user: {
      id: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      avatar: profile.avatar,
      isAdmin: profile.isAdmin
    }
  });
}
__name(handleAuthCallback, "handleAuthCallback");
async function handleAuthMe(request, env) {
  const sessionToken = extractBearerToken(request);
  if (!sessionToken) {
    return json({ error: "Missing or invalid Authorization header" }, 401);
  }
  const sessionData = await env.KV.get(`session:${sessionToken}`, "json");
  if (!sessionData) {
    return json({ error: "Session expired or invalid" }, 401);
  }
  const roomCount = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM rooms WHERE owner_user_id = ? AND status = 'active'`
  ).bind(sessionData.userId).first();
  return json({
    user: {
      id: sessionData.userId,
      email: sessionData.email,
      displayName: sessionData.displayName,
      avatar: sessionData.avatar,
      isAdmin: sessionData.isAdmin
    },
    activeRooms: roomCount?.count || 0,
    maxRooms: 10
    // free plan
  });
}
__name(handleAuthMe, "handleAuthMe");
async function handleAuthRefresh(request, env) {
  const sessionToken = extractBearerToken(request);
  if (!sessionToken) {
    return json({ error: "Missing session token" }, 401);
  }
  const sessionData = await env.KV.get(`session:${sessionToken}`, "json");
  if (!sessionData || !sessionData.refreshToken) {
    return json({ error: "Session expired" }, 401);
  }
  const tokenRes = await fetch(`${env.ELIXPO_AUTH_URL}/api/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: sessionData.refreshToken,
      client_id: env.ELIXPO_CLIENT_ID
    })
  });
  if (!tokenRes.ok) {
    await env.KV.delete(`session:${sessionToken}`);
    return json({ error: "Refresh failed, please sign in again" }, 401);
  }
  const tokens = await tokenRes.json();
  sessionData.refreshToken = tokens.refresh_token;
  await env.KV.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
    expirationTtl: 86400
  });
  return json({ success: true });
}
__name(handleAuthRefresh, "handleAuthRefresh");
async function handleSceneSave(request, env) {
  try {
    const body = await request.json();
    if (!body.sessionId || !body.encryptedData) {
      return json({ error: "Missing sessionId or encryptedData" }, 400);
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
        body.workspaceName || "Untitled",
        body.encryptedData,
        body.permission || "view",
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
        body.permission || "view"
      )
    ]);
    return json({ sceneId, token }, 201);
  } catch (err) {
    return json({ error: "Failed to save scene" }, 500);
  }
}
__name(handleSceneSave, "handleSceneSave");
async function handleSceneLoad(request, env) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return json({ error: "Missing token" }, 400);
    }
    const perm = await env.DB.prepare(
      `SELECT sp.permission, s.encrypted_data, s.workspace_name, s.session_id
       FROM scene_permissions sp
       JOIN scenes s ON sp.scene_id = s.id
       WHERE sp.token = ?`
    ).bind(token).first();
    if (!perm) {
      return json({ error: "Scene not found or link expired" }, 404);
    }
    await env.DB.prepare(
      `UPDATE scenes SET view_count = view_count + 1 WHERE session_id = ?`
    ).bind(perm.session_id).run();
    return json({
      encryptedData: perm.encrypted_data,
      permission: perm.permission,
      workspaceName: perm.workspace_name
    });
  } catch (err) {
    return json({ error: "Failed to load scene" }, 500);
  }
}
__name(handleSceneLoad, "handleSceneLoad");
async function handleImageSign(request, env) {
  try {
    const body = await request.json();
    if (!body.sessionId) {
      return json({ error: "Missing sessionId" }, 400);
    }
    const timestamp = Math.floor(Date.now() / 1e3);
    const folder = `lixsketch/${body.sessionId}`;
    const publicId = `${folder}/${body.filename || `img_${timestamp}`}`;
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = await cloudinarySign(paramsToSign, env.CLOUDINARY_SECRET);
    return json({
      signature,
      timestamp,
      apiKey: env.CLOUDINARY_KEY,
      folder,
      publicId,
      cloudName: "elixpo"
      // Cloudinary cloud name
    });
  } catch (err) {
    return json({ error: "Failed to generate upload signature" }, 500);
  }
}
__name(handleImageSign, "handleImageSign");
async function cloudinarySign(params, apiSecret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(apiSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(params + apiSecret));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(cloudinarySign, "cloudinarySign");
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}
__name(json, "json");
function generateToken(length = 32) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}
__name(generateToken, "generateToken");
function extractBearerToken(request) {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}
__name(extractBearerToken, "extractBearerToken");
export {
  RoomDurableObject,
  index_default as default
};
//# sourceMappingURL=index.js.map
