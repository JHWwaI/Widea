import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";

type Connection = WebSocket & {
  userId?: string;
  userName?: string;
  alive?: boolean;
  officeRoom?: string;
};

const userConnections = new Map<string, Set<Connection>>();
/** 가상 사무실 — roomId(=ideaId) → 접속자 connection 집합 */
const officeRooms = new Map<string, Set<Connection>>();

function joinOffice(ws: Connection, roomId: string) {
  ws.officeRoom = roomId;
  let set = officeRooms.get(roomId);
  if (!set) {
    set = new Set();
    officeRooms.set(roomId, set);
  }
  set.add(ws);
}

function leaveOffice(ws: Connection) {
  if (!ws.officeRoom) return;
  const set = officeRooms.get(ws.officeRoom);
  if (set) {
    set.delete(ws);
    // 남은 사람들에게 leave 알림
    const data = JSON.stringify({ event: "office.leave", payload: { userId: ws.userId } });
    for (const peer of set) {
      if (peer.readyState === WebSocket.OPEN) {
        try { peer.send(data); } catch { /* ignore */ }
      }
    }
    if (set.size === 0) officeRooms.delete(ws.officeRoom);
  }
  ws.officeRoom = undefined;
}

function relayOffice(ws: Connection, event: string, payload: unknown) {
  if (!ws.officeRoom || !ws.userId) return;
  const set = officeRooms.get(ws.officeRoom);
  if (!set) return;
  const data = JSON.stringify({ event, payload: { ...(payload as object), userId: ws.userId, userName: ws.userName } });
  for (const peer of set) {
    if (peer === ws) continue;
    if (peer.readyState === WebSocket.OPEN) {
      try { peer.send(data); } catch { /* ignore */ }
    }
  }
}

function addConn(userId: string, ws: Connection) {
  let set = userConnections.get(userId);
  if (!set) {
    set = new Set();
    userConnections.set(userId, set);
  }
  set.add(ws);
}

function removeConn(userId: string, ws: Connection) {
  const set = userConnections.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) userConnections.delete(userId);
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  const set = userConnections.get(userId);
  if (!set) return;
  const data = JSON.stringify({ event, payload });
  for (const ws of set) {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(data); } catch { /* drop */ }
    }
  }
}

export async function emitToWorkspace(
  prisma: PrismaClient,
  ideaId: string,
  event: string,
  payload: unknown,
): Promise<void> {
  const idea = await prisma.generatedIdea.findUnique({
    where: { id: ideaId },
    include: { session: { include: { projectPolicy: true } } },
  });
  if (!idea) return;
  const ownerId = idea.session.projectPolicy.userId;
  const members = await prisma.ideaWorkspaceMember.findMany({
    where: { ideaId },
    select: { userId: true },
  });
  const userIds = new Set<string>([ownerId, ...members.map((m) => m.userId)]);
  for (const uid of userIds) emitToUser(uid, event, payload);
}

export function attachRealtime(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: Connection, req) => {
    try {
      const url = new URL(req.url ?? "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");
      if (!token) {
        ws.close(1008, "missing token");
        return;
      }
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        ws.close(1011, "server misconfig");
        return;
      }
      const payload = jwt.verify(token, secret) as { userId: string; email?: string };
      ws.userId = payload.userId;
      ws.alive = true;
      addConn(payload.userId, ws);
      // 사용자 이름 비동기 로드 (가상 사무실 이름표용)
      ws.userName = payload.email?.split("@")[0] ?? "anon";
      ws.send(JSON.stringify({ event: "ready", payload: { userId: payload.userId } }));
    } catch {
      ws.close(1008, "invalid token");
      return;
    }

    ws.on("pong", () => { ws.alive = true; });
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.event === "ping") {
          ws.send(JSON.stringify({ event: "pong" }));
          return;
        }
        if (msg.event === "office.join" && typeof msg.payload?.roomId === "string") {
          if (typeof msg.payload?.name === "string") ws.userName = msg.payload.name;
          leaveOffice(ws);
          joinOffice(ws, msg.payload.roomId);
          // 새로 들어온 사람에게 현재 룸 인원 목록 전송
          const set = officeRooms.get(msg.payload.roomId);
          const peers = set ? Array.from(set).filter((p) => p !== ws && !!p.userId).map((p) => ({ userId: p.userId, userName: p.userName })) : [];
          ws.send(JSON.stringify({ event: "office.peers", payload: { peers } }));
          // 기존 사람들에게 새 입장 알림
          relayOffice(ws, "office.join", { name: ws.userName });
          return;
        }
        if (msg.event === "office.move") {
          relayOffice(ws, "office.move", msg.payload);
          return;
        }
        if (msg.event === "office.leave") {
          leaveOffice(ws);
          return;
        }
      } catch { /* ignore */ }
    });
    ws.on("close", () => {
      leaveOffice(ws);
      if (ws.userId) removeConn(ws.userId, ws);
    });
    ws.on("error", () => {
      leaveOffice(ws);
      if (ws.userId) removeConn(ws.userId, ws);
    });
  });

  // 30초마다 dead 연결 정리
  setInterval(() => {
    for (const conns of userConnections.values()) {
      for (const ws of conns) {
        if (ws.alive === false) {
          ws.terminate();
          continue;
        }
        ws.alive = false;
        try { ws.ping(); } catch { /* ignore */ }
      }
    }
  }, 30_000);
}
