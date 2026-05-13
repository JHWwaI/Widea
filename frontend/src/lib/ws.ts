"use client";

/**
 * WebSocket 클라이언트 — 단일 연결, auto-reconnect, 이벤트 구독.
 *
 * 사용:
 *   import { connectWS, subscribeWS } from "@/lib/ws";
 *   connectWS(token);
 *   const unsub = subscribeWS("chat.message", (payload) => { ... });
 */

type Handler = (payload: unknown) => void;

let socket: WebSocket | null = null;
let currentToken: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let backoffMs = 1000;
const handlers = new Map<string, Set<Handler>>();

function wsUrl(token: string): string {
  const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  if (apiBase) {
    const proto = apiBase.startsWith("https") ? "wss" : "ws";
    const host = apiBase.replace(/^https?:\/\//, "");
    return `${proto}://${host}/ws?token=${encodeURIComponent(token)}`;
  }
  // dev fallback: same origin → /ws (rewrites는 ws 안 함, 그래서 직접 host:3001 사용)
  if (typeof window === "undefined") return "";
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws?token=${encodeURIComponent(token)}`;
}

function dispatch(event: string, payload: unknown) {
  const set = handlers.get(event);
  if (!set) return;
  for (const h of set) {
    try { h(payload); } catch { /* ignore */ }
  }
}

function open() {
  if (!currentToken || typeof window === "undefined") return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;
  try {
    socket = new WebSocket(wsUrl(currentToken));
  } catch {
    scheduleReconnect();
    return;
  }
  socket.onopen = () => {
    backoffMs = 1000;
  };
  socket.onmessage = (e) => {
    try {
      const { event, payload } = JSON.parse(e.data);
      if (typeof event === "string") dispatch(event, payload);
    } catch { /* ignore */ }
  };
  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };
  socket.onerror = () => {
    try { socket?.close(); } catch { /* ignore */ }
  };
}

function scheduleReconnect() {
  if (!currentToken) return;
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    open();
  }, backoffMs);
  backoffMs = Math.min(backoffMs * 2, 30_000);
}

export function connectWS(token: string | null): void {
  if (token === currentToken) {
    if (token && (!socket || socket.readyState >= WebSocket.CLOSING)) open();
    return;
  }
  currentToken = token;
  if (socket) {
    try { socket.close(); } catch { /* ignore */ }
    socket = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (token) open();
}

export function sendWS(event: string, payload?: unknown): boolean {
  if (!socket || socket.readyState !== WebSocket.OPEN) return false;
  try {
    socket.send(JSON.stringify({ event, payload }));
    return true;
  } catch {
    return false;
  }
}

export function subscribeWS(event: string, handler: Handler): () => void {
  let set = handlers.get(event);
  if (!set) {
    set = new Set();
    handlers.set(event, set);
  }
  set.add(handler);
  return () => {
    set!.delete(handler);
    if (set!.size === 0) handlers.delete(event);
  };
}
