"use client";

/**
 * 가장 단순하고 안전한 사무실 — drei 의존 최소화, 셰이더·폰트·HTML오버레이 모두 제거.
 * 어떤 환경에서든 렌더되는 게 목표.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { subscribeWS, sendWS } from "@/lib/ws";
import type { AvatarConfig } from "./AvatarCustomizer";
import { DEFAULT_AVATAR } from "./AvatarCustomizer";

type Peer = {
  userId: string;
  userName?: string;
  position: [number, number, number];
  rotationY: number;
  avatar?: AvatarConfig;
};

const ROOM = 24;

function Floor() {
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[ROOM, ROOM]} />
      <meshStandardMaterial color="#7a6347" />
    </mesh>
  );
}

function Walls() {
  const half = ROOM / 2;
  return (
    <group>
      <mesh position={[0, 1.5, -half]}>
        <boxGeometry args={[ROOM, 3, 0.2]} />
        <meshStandardMaterial color="#d6cdb8" />
      </mesh>
      <mesh position={[0, 1.5, half]}>
        <boxGeometry args={[ROOM, 3, 0.2]} />
        <meshStandardMaterial color="#d6cdb8" />
      </mesh>
      <mesh position={[-half, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, ROOM]} />
        <meshStandardMaterial color="#d6cdb8" />
      </mesh>
      <mesh position={[half, 1.5, 0]}>
        <boxGeometry args={[0.2, 3, ROOM]} />
        <meshStandardMaterial color="#d6cdb8" />
      </mesh>
    </group>
  );
}

function Desk({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[2, 0.08, 1]} />
        <meshStandardMaterial color="#8a6d50" />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <boxGeometry args={[1.8, 0.85, 0.06]} />
        <meshStandardMaterial color="#3a3a44" />
      </mesh>
      <mesh position={[0, 1.4, -0.3]}>
        <boxGeometry args={[1, 0.6, 0.05]} />
        <meshStandardMaterial color="#1a1a22" emissive="#3a6dc8" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function MeetingTable() {
  return (
    <group position={[0, 0, 6]}>
      <mesh position={[0, 0.75, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 24]} />
        <meshStandardMaterial color="#8a6d50" />
      </mesh>
      <mesh position={[0, 0.37, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.78, 12]} />
        <meshStandardMaterial color="#2c241c" />
      </mesh>
    </group>
  );
}

function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ["#7C8DFF", "#5DD3D0", "#F5C158", "#F2868E", "#A78BFA", "#67D196", "#FB923C"][h % 7];
}

function Avatar({
  position,
  rotationY,
  bodyColor,
}: {
  position: [number, number, number];
  rotationY: number;
  bodyColor: string;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* 다리 */}
      <mesh position={[-0.13, 0.27, 0]}>
        <boxGeometry args={[0.2, 0.55, 0.2]} />
        <meshStandardMaterial color="#2f2f3a" />
      </mesh>
      <mesh position={[0.13, 0.27, 0]}>
        <boxGeometry args={[0.2, 0.55, 0.2]} />
        <meshStandardMaterial color="#2f2f3a" />
      </mesh>
      {/* 몸통 */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.65, 0.85, 0.45]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      {/* 머리 */}
      <mesh position={[0, 1.65, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#f1d5be" />
      </mesh>
      {/* 코 (방향 마커) */}
      <mesh position={[0, 1.65, 0.28]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#caa088" />
      </mesh>
    </group>
  );
}

function Player({
  myAvatar,
  onPos,
}: {
  myAvatar: AvatarConfig;
  onPos: (pos: [number, number, number], rotY: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const lastEmit = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (ref.current) ref.current.position.set(0, 0, 6);
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, dt) => {
    if (!ref.current) return;
    const speed = 5;
    let dx = 0, dz = 0;
    if (keys.current["w"] || keys.current["arrowup"]) dz -= 1;
    if (keys.current["s"] || keys.current["arrowdown"]) dz += 1;
    if (keys.current["a"] || keys.current["arrowleft"]) dx -= 1;
    if (keys.current["d"] || keys.current["arrowright"]) dx += 1;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len; dz /= len;
      const m = speed * dt;
      const half = ROOM / 2 - 0.6;
      ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x + dx * m, -half, half);
      ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z + dz * m, -half, half);
      ref.current.rotation.y = Math.atan2(dx, dz);
    }
    // 카메라 follow
    const target = ref.current.position.clone();
    camera.position.lerp(new THREE.Vector3(target.x, target.y + 5, target.z + 8), 0.1);
    camera.lookAt(target.x, target.y + 1.4, target.z);
    // emit
    const now = performance.now();
    if (now - lastEmit.current > 100) {
      lastEmit.current = now;
      onPos(
        [ref.current.position.x, ref.current.position.y, ref.current.position.z],
        ref.current.rotation.y,
      );
    }
  });

  return (
    <group ref={ref}>
      <Avatar position={[0, 0, 0]} rotationY={0} bodyColor={myAvatar.bodyColor} />
    </group>
  );
}

export default function MinimalOffice({
  roomId,
  myId,
  myName,
  myAvatar,
}: {
  roomId: string;
  myId: string;
  myName: string;
  myAvatar: AvatarConfig;
}) {
  void myId;
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());

  useEffect(() => {
    let tries = 0;
    const join = () => {
      if (sendWS("office.join", { roomId, name: myName, avatar: myAvatar })) return;
      if (++tries < 20) setTimeout(join, 250);
    };
    join();

    const us1 = subscribeWS("office.peers", (p) => {
      const data = p as { peers: { userId: string; userName?: string }[] };
      const m = new Map<string, Peer>();
      data.peers.forEach((peer) =>
        m.set(peer.userId, { userId: peer.userId, userName: peer.userName, position: [0, 0, 0], rotationY: 0 }),
      );
      setPeers(m);
    });
    const us2 = subscribeWS("office.join", (p) => {
      const data = p as { userId: string; userName?: string; avatar?: AvatarConfig };
      setPeers((m) => {
        const next = new Map(m);
        next.set(data.userId, { userId: data.userId, userName: data.userName, position: [0, 0, 0], rotationY: 0, avatar: data.avatar });
        return next;
      });
    });
    const us3 = subscribeWS("office.move", (p) => {
      const data = p as { userId: string; userName?: string; x: number; y: number; z: number; r: number; avatar?: AvatarConfig };
      setPeers((m) => {
        const next = new Map(m);
        const ex = next.get(data.userId);
        next.set(data.userId, {
          userId: data.userId,
          userName: data.userName ?? ex?.userName,
          position: [data.x, data.y, data.z],
          rotationY: data.r,
          avatar: data.avatar ?? ex?.avatar,
        });
        return next;
      });
    });
    const us4 = subscribeWS("office.leave", (p) => {
      const data = p as { userId: string };
      setPeers((m) => {
        const n = new Map(m);
        n.delete(data.userId);
        return n;
      });
    });
    return () => {
      us1(); us2(); us3(); us4();
      sendWS("office.leave", {});
    };
  }, [roomId, myName, myAvatar]);

  function send(pos: [number, number, number], rotY: number) {
    sendWS("office.move", { x: pos[0], y: pos[1], z: pos[2], r: rotY, avatar: myAvatar });
  }

  return (
    <Canvas camera={{ position: [0, 6, 14], fov: 55 }}>
      <color attach="background" args={["#2a2530"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 5]} intensity={1.3} />
      <Floor />
      <Walls />
      <Desk position={[-5, 0, -8]} />
      <Desk position={[0, 0, -8]} />
      <Desk position={[5, 0, -8]} />
      <MeetingTable />
      <Player myAvatar={myAvatar} onPos={send} />
      {Array.from(peers.values()).map((p) => (
        <Avatar
          key={p.userId}
          position={p.position}
          rotationY={p.rotationY}
          bodyColor={p.avatar?.bodyColor ?? colorFromId(p.userId) ?? DEFAULT_AVATAR.bodyColor}
        />
      ))}
    </Canvas>
  );
}
