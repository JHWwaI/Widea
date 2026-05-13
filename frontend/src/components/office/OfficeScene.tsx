"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, RoundedBox, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
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

const ROOM_W = 36;
const ROOM_D = 28;
const WALL_HEIGHT = 5.5;

/* ────────────────── 룸 ────────────────── */

function Floor() {
  return (
    <group>
      {/* 메인 바닥 — 따뜻한 우드 톤 */}
      <mesh rotation-x={-Math.PI / 2} >
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#7d6347" roughness={0.85} />
      </mesh>
      {/* 카펫 — 회의구역 */}
      <mesh position={[6, 0.01, 6]} rotation-x={-Math.PI / 2} >
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial color="#3b3f52" roughness={0.95} />
      </mesh>
      {/* 카펫 — 라운지 */}
      <mesh position={[-10, 0.01, 6]} rotation-x={-Math.PI / 2} >
        <circleGeometry args={[3.5, 32]} />
        <meshStandardMaterial color="#5a4a3a" roughness={0.95} />
      </mesh>
    </group>
  );
}

function Walls() {
  const halfW = ROOM_W / 2;
  const halfD = ROOM_D / 2;
  return (
    <group>
      {/* 뒷벽 */}
      <mesh position={[0, WALL_HEIGHT / 2, -halfD]} >
        <boxGeometry args={[ROOM_W, WALL_HEIGHT, 0.3]} />
        <meshStandardMaterial color="#dfd6c8" roughness={0.95} />
      </mesh>
      {/* 앞벽 (뚫린 입구) */}
      <mesh position={[-halfW + 5, WALL_HEIGHT / 2, halfD]} >
        <boxGeometry args={[10, WALL_HEIGHT, 0.3]} />
        <meshStandardMaterial color="#dfd6c8" />
      </mesh>
      <mesh position={[halfW - 5, WALL_HEIGHT / 2, halfD]} >
        <boxGeometry args={[10, WALL_HEIGHT, 0.3]} />
        <meshStandardMaterial color="#dfd6c8" />
      </mesh>
      {/* 좌측벽 */}
      <mesh position={[-halfW, WALL_HEIGHT / 2, 0]} >
        <boxGeometry args={[0.3, WALL_HEIGHT, ROOM_D]} />
        <meshStandardMaterial color="#dfd6c8" />
      </mesh>
      {/* 우측벽 — 큰 창문 (밝은 노을) */}
      <mesh position={[halfW, WALL_HEIGHT / 2, 0]} >
        <boxGeometry args={[0.3, WALL_HEIGHT, ROOM_D]} />
        <meshStandardMaterial color="#dfd6c8" />
      </mesh>
      {/* 창문 패널 (우측벽에 붙음) */}
      {[-8, -2, 4].map((z) => (
        <mesh key={z} position={[halfW - 0.16, 2.5, z]}>
          <boxGeometry args={[0.05, 3, 4]} />
          <meshStandardMaterial
            color="#ffd9a8"
            emissive="#ffb168"
            emissiveIntensity={0.45}
            roughness={0.2}
          />
        </mesh>
      ))}
      {/* 천장 */}
      <mesh position={[0, WALL_HEIGHT, 0]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#f0ebe0" />
      </mesh>
    </group>
  );
}

function Logo() {
  return (
    <Text
      position={[0, 4.2, -ROOM_D / 2 + 0.18]}
      fontSize={1.4}
      color="#5b6cff"
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.04}
      outlineColor="#1a1f3a"
    >
      WIDEA
    </Text>
  );
}

/* ────────────────── 가구 ────────────────── */

function Desk({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation-y={rotation}>
      {/* 책상 상판 */}
      <RoundedBox args={[2.3, 0.08, 1.1]} radius={0.03} position={[0, 0.85, 0]} >
        <meshStandardMaterial color="#a08066" roughness={0.6} />
      </RoundedBox>
      {/* 다리 (양옆 ㄷ자) */}
      <mesh position={[-1.05, 0.42, 0]}>
        <boxGeometry args={[0.08, 0.85, 1]} />
        <meshStandardMaterial color="#2c241c" />
      </mesh>
      <mesh position={[1.05, 0.42, 0]}>
        <boxGeometry args={[0.08, 0.85, 1]} />
        <meshStandardMaterial color="#2c241c" />
      </mesh>
      {/* 모니터 + 스탠드 */}
      <mesh position={[0, 1.05, -0.25]}>
        <boxGeometry args={[0.05, 0.3, 0.05]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
      <RoundedBox args={[1.2, 0.72, 0.06]} radius={0.02} position={[0, 1.5, -0.25]}>
        <meshStandardMaterial color="#0a0a14" />
      </RoundedBox>
      <mesh position={[0, 1.5, -0.22]}>
        <planeGeometry args={[1.1, 0.65]} />
        <meshStandardMaterial
          color="#3060c8"
          emissive="#5db4ff"
          emissiveIntensity={0.85}
          roughness={0.1}
        />
      </mesh>
      {/* 키보드 */}
      <RoundedBox args={[0.7, 0.04, 0.22]} radius={0.01} position={[0, 0.91, 0.2]}>
        <meshStandardMaterial color="#2a2a30" />
      </RoundedBox>
      {/* 의자 */}
      <RoundedBox args={[0.65, 0.08, 0.65]} radius={0.03} position={[0, 0.46, 1.1]}>
        <meshStandardMaterial color="#3a3a44" />
      </RoundedBox>
      <RoundedBox args={[0.65, 0.7, 0.08]} radius={0.03} position={[0, 0.85, 1.4]}>
        <meshStandardMaterial color="#3a3a44" />
      </RoundedBox>
      <mesh position={[0, 0.18, 1.1]}>
        <cylinderGeometry args={[0.05, 0.05, 0.36, 8]} />
        <meshStandardMaterial color="#1f1f25" />
      </mesh>
    </group>
  );
}

/** 책상 사이 칸막이 */
function Partition({ position, length = 2.5 }: { position: [number, number, number]; length?: number }) {
  return (
    <RoundedBox args={[0.06, 1.4, length]} radius={0.025} position={position}>
      <meshStandardMaterial color="#5a5e6c" roughness={0.7} />
    </RoundedBox>
  );
}

function Plant({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.28, 0.22, 0.36, 16]} />
        <meshStandardMaterial color="#bfa37a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.55, 14, 14]} />
        <meshStandardMaterial color="#4d8b3e" roughness={1} />
      </mesh>
      <mesh position={[-0.25, 1.1, 0.1]}>
        <sphereGeometry args={[0.32, 12, 12]} />
        <meshStandardMaterial color="#5fa84a" roughness={1} />
      </mesh>
      <mesh position={[0.22, 1.05, -0.1]}>
        <sphereGeometry args={[0.3, 12, 12]} />
        <meshStandardMaterial color="#3e7a32" roughness={1} />
      </mesh>
    </group>
  );
}

function MeetingTable() {
  return (
    <group position={[6, 0, 6]}>
      {/* 라운드 테이블 */}
      <mesh position={[0, 0.78, 0]} >
        <cylinderGeometry args={[1.6, 1.6, 0.1, 32]} />
        <meshStandardMaterial color="#a08066" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.39, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 0.78, 16]} />
        <meshStandardMaterial color="#2c241c" />
      </mesh>
      {/* 의자 6개 */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const r = 2.7;
        return (
          <group key={i} position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]} rotation-y={-angle + Math.PI}>
            <RoundedBox args={[0.7, 0.08, 0.7]} radius={0.03} position={[0, 0.46, 0]}>
              <meshStandardMaterial color="#5b6cff" />
            </RoundedBox>
            <RoundedBox args={[0.7, 0.7, 0.08]} radius={0.03} position={[0, 0.85, 0.32]}>
              <meshStandardMaterial color="#5b6cff" />
            </RoundedBox>
          </group>
        );
      })}
    </group>
  );
}

function Sofa() {
  return (
    <group position={[-10, 0, 6]}>
      {/* 좌석 */}
      <RoundedBox args={[3, 0.5, 1.2]} radius={0.15} position={[0, 0.4, 0]}>
        <meshStandardMaterial color="#c8b08e" roughness={0.85} />
      </RoundedBox>
      {/* 등받이 */}
      <RoundedBox args={[3, 0.7, 0.3]} radius={0.1} position={[0, 0.85, -0.5]}>
        <meshStandardMaterial color="#c8b08e" />
      </RoundedBox>
      {/* 쿠션 */}
      <RoundedBox args={[0.6, 0.4, 0.6]} radius={0.1} position={[-1, 0.7, -0.2]}>
        <meshStandardMaterial color="#7a6f5c" />
      </RoundedBox>
      <RoundedBox args={[0.6, 0.4, 0.6]} radius={0.1} position={[1, 0.7, -0.2]}>
        <meshStandardMaterial color="#7a6f5c" />
      </RoundedBox>
      {/* 작은 테이블 */}
      <mesh position={[0, 0.35, 1.7]}>
        <cylinderGeometry args={[0.5, 0.5, 0.08, 24]} />
        <meshStandardMaterial color="#a08066" />
      </mesh>
      <mesh position={[0, 0.18, 1.7]}>
        <cylinderGeometry args={[0.06, 0.06, 0.34, 8]} />
        <meshStandardMaterial color="#2c241c" />
      </mesh>
    </group>
  );
}

function Whiteboard() {
  return (
    <group position={[6, 1.6, -ROOM_D / 2 + 0.2]}>
      <RoundedBox args={[3.5, 1.8, 0.06]} radius={0.025}>
        <meshStandardMaterial color="#fafafa" />
      </RoundedBox>
      <RoundedBox args={[3.7, 0.08, 0.08]} radius={0.02} position={[0, -0.95, 0]}>
        <meshStandardMaterial color="#a08066" />
      </RoundedBox>
    </group>
  );
}

function CoffeeStation() {
  return (
    <group position={[-ROOM_W / 2 + 1.5, 0, -ROOM_D / 2 + 1.2]}>
      {/* 카운터 */}
      <RoundedBox args={[2, 1, 1]} radius={0.05} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#3a2418" roughness={0.5} />
      </RoundedBox>
      {/* 머신 */}
      <RoundedBox args={[0.5, 0.7, 0.4]} radius={0.04} position={[-0.4, 1.35, 0]}>
        <meshStandardMaterial color="#1a1a22" metalness={0.5} roughness={0.4} />
      </RoundedBox>
      {/* 컵 */}
      <mesh position={[0.3, 1.1, 0.1]}>
        <cylinderGeometry args={[0.08, 0.06, 0.16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.55, 1.1, -0.1]}>
        <cylinderGeometry args={[0.08, 0.06, 0.16, 16]} />
        <meshStandardMaterial color="#ffe9c8" />
      </mesh>
    </group>
  );
}

/* ────────────────── 아바타 ────────────────── */

function Avatar({
  position,
  rotationY,
  config,
  name,
}: {
  position: [number, number, number];
  rotationY: number;
  config: AvatarConfig;
  name: string;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      {/* 다리 */}
      <RoundedBox args={[0.22, 0.55, 0.22]} radius={0.06} position={[-0.14, 0.27, 0]}>
        <meshStandardMaterial color="#2f2f3a" />
      </RoundedBox>
      <RoundedBox args={[0.22, 0.55, 0.22]} radius={0.06} position={[0.14, 0.27, 0]}>
        <meshStandardMaterial color="#2f2f3a" />
      </RoundedBox>
      {/* 몸통 (옷) */}
      <RoundedBox args={[0.7, 0.85, 0.5]} radius={0.18} position={[0, 0.95, 0]}>
        <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
      </RoundedBox>
      {/* 팔 */}
      <RoundedBox args={[0.18, 0.7, 0.18]} radius={0.07} position={[-0.42, 0.95, 0]}>
        <meshStandardMaterial color={config.bodyColor} />
      </RoundedBox>
      <RoundedBox args={[0.18, 0.7, 0.18]} radius={0.07} position={[0.42, 0.95, 0]}>
        <meshStandardMaterial color={config.bodyColor} />
      </RoundedBox>
      {/* 머리 */}
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color="#f1d5be" roughness={0.6} />
      </mesh>
      {/* 머리 스타일 */}
      {config.hairStyle === "short" ? (
        <mesh position={[0, 1.88, 0]}>
          <sphereGeometry args={[0.34, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={config.hairColor} />
        </mesh>
      ) : null}
      {config.hairStyle === "long" ? (
        <>
          <mesh position={[0, 1.88, 0]}>
            <sphereGeometry args={[0.34, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
          <mesh position={[0, 1.5, -0.05]}>
            <boxGeometry args={[0.6, 0.5, 0.18]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
        </>
      ) : null}
      {config.hairStyle === "cap" ? (
        <>
          <mesh position={[0, 1.95, 0]}>
            <sphereGeometry args={[0.36, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
          <mesh position={[0, 1.85, 0.32]}>
            <boxGeometry args={[0.58, 0.06, 0.22]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
        </>
      ) : null}
      {/* 눈 */}
      <mesh position={[-0.1, 1.7, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
      <mesh position={[0.1, 1.7, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
      {/* 이름표 */}
      <Text
        position={[0, 2.5, 0]}
        fontSize={0.26}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.025}
        outlineColor="#000000"
      >
        {name}
      </Text>
    </group>
  );
}

/* ────────────────── 플레이어 ────────────────── */

function Player({
  myId,
  myName,
  config,
  onPositionChange,
}: {
  myId: string;
  myName: string;
  config: AvatarConfig;
  onPositionChange: (pos: [number, number, number], rotationY: number) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const positionRef = useRef<[number, number, number]>([0, 0, 8]);
  const rotationRef = useRef(Math.PI);
  const lastEmitRef = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(0, 0, 8);
      ref.current.rotation.y = Math.PI;
    }
    const down = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = true; };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const speed = 4.5;
    let dx = 0;
    let dz = 0;
    if (keys.current["w"] || keys.current["arrowup"]) dz -= 1;
    if (keys.current["s"] || keys.current["arrowdown"]) dz += 1;
    if (keys.current["a"] || keys.current["arrowleft"]) dx -= 1;
    if (keys.current["d"] || keys.current["arrowright"]) dx += 1;

    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
      const moveDist = speed * delta;
      const halfW = ROOM_W / 2 - 0.6;
      const halfD = ROOM_D / 2 - 0.6;
      const newX = THREE.MathUtils.clamp(ref.current.position.x + dx * moveDist, -halfW, halfW);
      const newZ = THREE.MathUtils.clamp(ref.current.position.z + dz * moveDist, -halfD, halfD);
      ref.current.position.x = newX;
      ref.current.position.z = newZ;
      rotationRef.current = Math.atan2(dx, dz);
      ref.current.rotation.y = rotationRef.current;
    }

    positionRef.current = [ref.current.position.x, ref.current.position.y, ref.current.position.z];

    // 카메라 — 3인칭 follow
    const camOffset = new THREE.Vector3(0, 4.5, 7.5);
    const target = ref.current.position.clone();
    const desired = target.clone().add(camOffset);
    camera.position.lerp(desired, 0.12);
    camera.lookAt(target.x, target.y + 1.4, target.z);

    const now = performance.now();
    if (now - lastEmitRef.current > 100) {
      lastEmitRef.current = now;
      onPositionChange(positionRef.current, rotationRef.current);
    }
  });

  return (
    <group ref={ref}>
      <Avatar position={[0, 0, 0]} rotationY={0} config={config} name={`${myName} (나)`} />
    </group>
  );
}

/* ────────────────── Scene ────────────────── */

export default function OfficeScene({
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
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());

  const sendPosition = useMemo(() => {
    return (pos: [number, number, number], rotY: number) => {
      sendWS("office.move", {
        x: pos[0], y: pos[1], z: pos[2], r: rotY,
        avatar: myAvatar,
      });
    };
  }, [myAvatar]);

  useEffect(() => {
    let tries = 0;
    const tryJoin = () => {
      if (sendWS("office.join", { roomId, name: myName, avatar: myAvatar })) return;
      tries += 1;
      if (tries < 20) setTimeout(tryJoin, 250);
    };
    tryJoin();

    const unsubPeers = subscribeWS("office.peers", (p) => {
      const data = p as { peers: { userId: string; userName?: string }[] };
      const m = new Map<string, Peer>();
      for (const peer of data.peers) {
        m.set(peer.userId, {
          userId: peer.userId,
          userName: peer.userName,
          position: [0, 0, 0],
          rotationY: 0,
        });
      }
      setPeers(m);
    });

    const unsubJoin = subscribeWS("office.join", (p) => {
      const data = p as { userId: string; userName?: string; avatar?: AvatarConfig };
      setPeers((m) => {
        const next = new Map(m);
        next.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          position: [0, 0, 0],
          rotationY: 0,
          avatar: data.avatar,
        });
        return next;
      });
    });

    const unsubMove = subscribeWS("office.move", (p) => {
      const data = p as {
        userId: string; userName?: string;
        x: number; y: number; z: number; r: number;
        avatar?: AvatarConfig;
      };
      setPeers((m) => {
        const next = new Map(m);
        const existing = next.get(data.userId);
        next.set(data.userId, {
          userId: data.userId,
          userName: data.userName ?? existing?.userName,
          position: [data.x, data.y, data.z],
          rotationY: data.r,
          avatar: data.avatar ?? existing?.avatar,
        });
        return next;
      });
    });

    const unsubLeave = subscribeWS("office.leave", (p) => {
      const data = p as { userId: string };
      setPeers((m) => {
        const next = new Map(m);
        next.delete(data.userId);
        return next;
      });
    });

    return () => {
      unsubPeers();
      unsubJoin();
      unsubMove();
      unsubLeave();
      sendWS("office.leave", {});
    };
  }, [roomId, myName, myAvatar]);

  return (
    <Canvas camera={{ position: [0, 5, 12], fov: 55 }}>
      <color attach="background" args={["#2a2530"]} />
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
      <pointLight position={[-10, 5, 6]} intensity={0.8} />
      <pointLight position={[8, 5, -6]} intensity={0.6} />

      {/* 룸 */}
      <Floor />
      <Walls />
      <Logo />

      {/* 책상 4개 (뒷벽 따라) — 칸막이 사이 */}
      <Desk position={[-9, 0, -9]} />
      <Desk position={[-3, 0, -9]} />
      <Desk position={[3, 0, -9]} />
      <Desk position={[9, 0, -9]} />
      <Partition position={[-6, 0.7, -9.4]} length={2.3} />
      <Partition position={[0, 0.7, -9.4]} length={2.3} />
      <Partition position={[6, 0.7, -9.4]} length={2.3} />

      {/* 회의 공간 */}
      <MeetingTable />
      <Whiteboard />

      {/* 라운지 */}
      <Sofa />

      {/* 카페 */}
      <CoffeeStation />

      {/* 식물들 */}
      <Plant position={[-ROOM_W / 2 + 1, 0, 4]} />
      <Plant position={[ROOM_W / 2 - 1, 0, -4]} />
      <Plant position={[ROOM_W / 2 - 1, 0, 10]} />
      <Plant position={[-3, 0, 4]} />

      {/* 본인 */}
      <Player myId={myId} myName={myName} config={myAvatar} onPositionChange={sendPosition} />

      {/* 다른 사람들 */}
      {Array.from(peers.values()).map((peer) => (
        <Avatar
          key={peer.userId}
          position={peer.position}
          rotationY={peer.rotationY}
          config={peer.avatar ?? DEFAULT_AVATAR}
          name={peer.userName ?? "anon"}
        />
      ))}

      {/* 안내 HTML */}
      <Html fullscreen>
        <div className="pointer-events-none absolute left-4 bottom-20 rounded-lg border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-zinc-200 backdrop-blur">
          <p className="font-semibold">조작</p>
          <p className="mt-0.5 text-zinc-400">WASD · 방향키 — 이동</p>
        </div>
      </Html>
    </Canvas>
  );
}
