"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, RoundedBox, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { subscribeWS, sendWS } from "@/lib/ws";
import type { AvatarConfig } from "./AvatarCustomizer";
import { DEFAULT_AVATAR } from "./AvatarCustomizer";

type Building = {
  ideaId: string;
  titleKo: string;
  ownerName: string;
  memberCount: number;
  canEnter: boolean;
};

type Peer = {
  userId: string;
  userName?: string;
  position: [number, number, number];
  rotationY: number;
  avatar?: AvatarConfig;
};

const CITY_SIZE = 80;

/* ────────────────── 도시 그라운드 ────────────────── */

function Ground() {
  return (
    <group>
      {/* 잔디 */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[CITY_SIZE, CITY_SIZE]} />
        <meshStandardMaterial color="#52764a" roughness={1} />
      </mesh>
      {/* 메인 도로 (가로) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[CITY_SIZE, 5]} />
        <meshStandardMaterial color="#3a3d44" roughness={0.85} />
      </mesh>
      {/* 메인 도로 (세로) */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[5, CITY_SIZE]} />
        <meshStandardMaterial color="#3a3d44" roughness={0.85} />
      </mesh>
      {/* 도로 차선 — 가로 */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={`hL-${i}`}
          rotation-x={-Math.PI / 2}
          position={[-CITY_SIZE / 2 + 4 + i * 7, 0.02, 0]}
          receiveShadow
        >
          <planeGeometry args={[2.5, 0.18]} />
          <meshStandardMaterial color="#f4d05e" />
        </mesh>
      ))}
      {/* 차선 — 세로 */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={`vL-${i}`}
          rotation-x={-Math.PI / 2}
          position={[0, 0.02, -CITY_SIZE / 2 + 4 + i * 7]}
          receiveShadow
        >
          <planeGeometry args={[0.18, 2.5]} />
          <meshStandardMaterial color="#f4d05e" />
        </mesh>
      ))}
    </group>
  );
}

function CityFrame() {
  // 도시 경계 — 낮은 울타리
  const half = CITY_SIZE / 2;
  return (
    <group>
      {([
        [0, -half],
        [0, half],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={`fz-${i}`} position={[x, 0.5, z]} castShadow>
          <boxGeometry args={[CITY_SIZE, 1, 0.2]} />
          <meshStandardMaterial color="#5a5e6c" />
        </mesh>
      ))}
      {([
        [-half, 0],
        [half, 0],
      ] as [number, number][]).map(([x, z], i) => (
        <mesh key={`fx-${i}`} position={[x, 0.5, z]} castShadow>
          <boxGeometry args={[0.2, 1, CITY_SIZE]} />
          <meshStandardMaterial color="#5a5e6c" />
        </mesh>
      ))}
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.22, 1.4, 10]} />
        <meshStandardMaterial color="#5a4232" />
      </mesh>
      <mesh position={[0, 1.9, 0]} castShadow>
        <coneGeometry args={[1.0, 1.6, 12]} />
        <meshStandardMaterial color="#3e7a32" />
      </mesh>
      <mesh position={[0, 2.6, 0]} castShadow>
        <coneGeometry args={[0.7, 1.2, 12]} />
        <meshStandardMaterial color="#4d8b3e" />
      </mesh>
    </group>
  );
}

function Lamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 3, 8]} />
        <meshStandardMaterial color="#1f1f25" />
      </mesh>
      <mesh position={[0, 3.05, 0]} castShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#fff4c8" emissive="#ffd76a" emissiveIntensity={0.9} />
      </mesh>
      <pointLight position={[0, 3.05, 0]} intensity={0.5} distance={8} color="#ffd76a" />
    </group>
  );
}

/* ────────────────── 빌딩 ────────────────── */

const BUILDING_COLORS = [
  "#9aa9d6", "#c8b6a0", "#a9c9bf", "#d6a89a",
  "#b0a9d8", "#d6c890", "#7ea5b0", "#c89aa9",
];

function colorFromId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return BUILDING_COLORS[h % BUILDING_COLORS.length];
}

function Building({
  building,
  position,
  isNear,
}: {
  building: Building;
  position: [number, number, number];
  isNear: boolean;
}) {
  const color = colorFromId(building.ideaId);
  const height = 5 + (building.memberCount % 3) * 1.5; // 멤버수 약간 반영해서 변화
  const accent = building.canEnter ? "#5b6cff" : "#74798a";

  return (
    <group position={position}>
      {/* 본체 */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[6, height, 6]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      {/* 지붕 */}
      <mesh position={[0, height + 0.3, 0]} castShadow>
        <boxGeometry args={[6.4, 0.6, 6.4]} />
        <meshStandardMaterial color="#3a3d44" />
      </mesh>
      {/* 창문들 */}
      {Array.from({ length: Math.max(1, Math.floor(height / 1.8)) }).map((_, row) =>
        [-1.5, 0, 1.5].map((cx) => (
          <mesh
            key={`w-${row}-${cx}`}
            position={[cx, 1.5 + row * 1.5, 3.01]}
          >
            <planeGeometry args={[0.7, 0.9]} />
            <meshStandardMaterial
              color="#e8eaf2"
              emissive="#9bb5ff"
              emissiveIntensity={0.55}
              roughness={0.3}
            />
          </mesh>
        )),
      )}
      {/* 입구 (정문) */}
      <mesh position={[0, 1, 3.05]} castShadow>
        <boxGeometry args={[1.4, 2, 0.1]} />
        <meshStandardMaterial color={accent} />
      </mesh>
      {/* 입구 위 회사명 사인 */}
      <mesh position={[0, 2.5, 3.06]}>
        <planeGeometry args={[3.5, 0.7]} />
        <meshStandardMaterial color="#0a0a14" />
      </mesh>
      <Text
        position={[0, 2.5, 3.07]}
        fontSize={0.3}
        color={building.canEnter ? "#7ce0d0" : "#a8aab8"}
        maxWidth={3.2}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
      >
        {building.titleKo}
      </Text>
      {/* 옥상 — 회사 이름 큰 텍스트 */}
      <Text
        position={[0, height + 1, 0]}
        fontSize={0.5}
        color="#1a1f3a"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#ffffff"
      >
        {building.titleKo}
      </Text>
      {/* 가까이 가면 입장 안내 */}
      {isNear ? (
        <Html position={[0, height + 2, 0]} center distanceFactor={10}>
          <div className="rounded-md border border-white/20 bg-black/80 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur whitespace-nowrap">
            {building.canEnter ? (
              <>
                <span className="font-medium">E 키</span>로 입장 ·{" "}
                <span className="text-zinc-400">{building.ownerName}님 · {building.memberCount}명</span>
              </>
            ) : (
              <span className="text-zinc-400">멤버만 입장 가능 · {building.ownerName}님 · {building.memberCount}명</span>
            )}
          </div>
        </Html>
      ) : null}
    </group>
  );
}

/* ────────────────── 빌딩 배치 ────────────────── */

function layoutBuildings(buildings: Building[]): Array<{ b: Building; pos: [number, number, number] }> {
  // 도로 4사분면, 각 사분면 4×4 그리드
  const quadrantOffsets: [number, number][] = [
    [-12, -12], [12, -12], [-12, 12], [12, 12],
  ];
  const result: Array<{ b: Building; pos: [number, number, number] }> = [];
  const spacing = 9;
  buildings.forEach((b, i) => {
    const q = i % 4;
    const idxInQ = Math.floor(i / 4);
    const col = idxInQ % 4;
    const row = Math.floor(idxInQ / 4);
    const [qx, qz] = quadrantOffsets[q];
    const sgnX = qx > 0 ? 1 : -1;
    const sgnZ = qz > 0 ? 1 : -1;
    const x = qx + sgnX * col * spacing;
    const z = qz + sgnZ * row * spacing;
    result.push({ b, pos: [x, 0, z] });
  });
  return result;
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
      <RoundedBox args={[0.22, 0.55, 0.22]} radius={0.06} position={[-0.14, 0.27, 0]} castShadow>
        <meshStandardMaterial color="#2f2f3a" />
      </RoundedBox>
      <RoundedBox args={[0.22, 0.55, 0.22]} radius={0.06} position={[0.14, 0.27, 0]} castShadow>
        <meshStandardMaterial color="#2f2f3a" />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.85, 0.5]} radius={0.18} position={[0, 0.95, 0]} castShadow>
        <meshStandardMaterial color={config.bodyColor} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[0.18, 0.7, 0.18]} radius={0.07} position={[-0.42, 0.95, 0]} castShadow>
        <meshStandardMaterial color={config.bodyColor} />
      </RoundedBox>
      <RoundedBox args={[0.18, 0.7, 0.18]} radius={0.07} position={[0.42, 0.95, 0]} castShadow>
        <meshStandardMaterial color={config.bodyColor} />
      </RoundedBox>
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.32, 24, 24]} />
        <meshStandardMaterial color="#f1d5be" roughness={0.6} />
      </mesh>
      {config.hairStyle === "short" ? (
        <mesh position={[0, 1.88, 0]} castShadow>
          <sphereGeometry args={[0.34, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={config.hairColor} />
        </mesh>
      ) : null}
      {config.hairStyle === "long" ? (
        <>
          <mesh position={[0, 1.88, 0]} castShadow>
            <sphereGeometry args={[0.34, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
          <mesh position={[0, 1.5, -0.05]} castShadow>
            <boxGeometry args={[0.6, 0.5, 0.18]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
        </>
      ) : null}
      {config.hairStyle === "cap" ? (
        <>
          <mesh position={[0, 1.95, 0]} castShadow>
            <sphereGeometry args={[0.36, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
          <mesh position={[0, 1.85, 0.32]} castShadow>
            <boxGeometry args={[0.58, 0.06, 0.22]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
        </>
      ) : null}
      <mesh position={[-0.1, 1.7, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
      <mesh position={[0.1, 1.7, 0.28]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#1a1a22" />
      </mesh>
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
  myName,
  config,
  buildings,
  layout,
  onPositionChange,
  onEnter,
  onNearBuilding,
}: {
  myName: string;
  config: AvatarConfig;
  buildings: Building[];
  layout: Array<{ b: Building; pos: [number, number, number] }>;
  onPositionChange: (pos: [number, number, number], rotationY: number) => void;
  onEnter: (b: Building) => void;
  onNearBuilding: (id: string | null) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const keys = useRef<Record<string, boolean>>({});
  const lastEmitRef = useRef(0);
  const { camera } = useThree();
  const nearIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.position.set(0, 0, 0); // 도시 정중앙
    }
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if (k === "e" && nearIdRef.current) {
        const found = buildings.find((b) => b.ideaId === nearIdRef.current);
        if (found && found.canEnter) onEnter(found);
      }
    };
    const up = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [buildings, onEnter]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    const speed = 6;
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
      const half = CITY_SIZE / 2 - 1;
      ref.current.position.x = THREE.MathUtils.clamp(ref.current.position.x + dx * moveDist, -half, half);
      ref.current.position.z = THREE.MathUtils.clamp(ref.current.position.z + dz * moveDist, -half, half);
      ref.current.rotation.y = Math.atan2(dx, dz);
    }

    // 카메라
    const camOffset = new THREE.Vector3(0, 6, 9);
    const target = ref.current.position.clone();
    const desired = target.clone().add(camOffset);
    camera.position.lerp(desired, 0.12);
    camera.lookAt(target.x, target.y + 1.4, target.z);

    // 가장 가까운 빌딩 (4유닛 이내)
    let near: string | null = null;
    let bestD = 4 * 4;
    for (const { b, pos } of layout) {
      const ddx = ref.current.position.x - pos[0];
      const ddz = ref.current.position.z - (pos[2] + 3); // 입구는 +z 쪽
      const d = ddx * ddx + ddz * ddz;
      if (d < bestD) {
        bestD = d;
        near = b.ideaId;
      }
    }
    if (near !== nearIdRef.current) {
      nearIdRef.current = near;
      onNearBuilding(near);
    }

    // 100ms emit
    const now = performance.now();
    if (now - lastEmitRef.current > 100) {
      lastEmitRef.current = now;
      onPositionChange(
        [ref.current.position.x, ref.current.position.y, ref.current.position.z],
        ref.current.rotation.y,
      );
    }
  });

  return (
    <group ref={ref}>
      <Avatar position={[0, 0, 0]} rotationY={0} config={config} name={`${myName} (나)`} />
    </group>
  );
}

/* ────────────────── Scene ────────────────── */

export default function CityScene({
  myId,
  myName,
  myAvatar,
  buildings,
  onEnterBuilding,
}: {
  myId: string;
  myName: string;
  myAvatar: AvatarConfig;
  buildings: Building[];
  onEnterBuilding: (ideaId: string) => void;
}) {
  void myId;
  const [peers, setPeers] = useState<Map<string, Peer>>(new Map());
  const [nearBuildingId, setNearBuildingId] = useState<string | null>(null);
  const layout = useMemo(() => layoutBuildings(buildings), [buildings]);

  const sendPosition = useMemo(() => {
    return (pos: [number, number, number], rotY: number) => {
      sendWS("office.move", { x: pos[0], y: pos[1], z: pos[2], r: rotY, avatar: myAvatar });
    };
  }, [myAvatar]);

  useEffect(() => {
    let tries = 0;
    const tryJoin = () => {
      if (sendWS("office.join", { roomId: "WIDEA_VALLEY", name: myName, avatar: myAvatar })) return;
      tries += 1;
      if (tries < 20) setTimeout(tryJoin, 250);
    };
    tryJoin();

    const unsubPeers = subscribeWS("office.peers", (p) => {
      const data = p as { peers: { userId: string; userName?: string }[] };
      const m = new Map<string, Peer>();
      for (const peer of data.peers) {
        m.set(peer.userId, { userId: peer.userId, userName: peer.userName, position: [0, 0, 0], rotationY: 0 });
      }
      setPeers(m);
    });
    const unsubJoin = subscribeWS("office.join", (p) => {
      const data = p as { userId: string; userName?: string; avatar?: AvatarConfig };
      setPeers((m) => {
        const next = new Map(m);
        next.set(data.userId, { userId: data.userId, userName: data.userName, position: [0, 0, 0], rotationY: 0, avatar: data.avatar });
        return next;
      });
    });
    const unsubMove = subscribeWS("office.move", (p) => {
      const data = p as { userId: string; userName?: string; x: number; y: number; z: number; r: number; avatar?: AvatarConfig };
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
  }, [myName, myAvatar]);

  return (
    <Canvas shadows camera={{ position: [0, 8, 14], fov: 55 }}>
      {/* 하늘 톤 */}
      <color attach="background" args={["#7eb6e8"]} />
      <fog attach="fog" args={["#a8c8e8", 50, 100]} />

      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight
        position={[20, 25, 10]}
        intensity={1.3}
        color="#fff5e0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      <Ground />
      <CityFrame />

      {/* 가로등 4개 (교차로 모서리) */}
      <Lamp position={[3, 0, 3]} />
      <Lamp position={[-3, 0, 3]} />
      <Lamp position={[3, 0, -3]} />
      <Lamp position={[-3, 0, -3]} />

      {/* 나무들 */}
      {[
        [-6, 8], [6, 8], [-6, -8], [6, -8],
        [-22, 0], [22, 0], [0, 22], [0, -22],
        [-30, -30], [30, 30], [-30, 30], [30, -30],
      ].map(([x, z], i) => (
        <Tree key={`t-${i}`} position={[x, 0, z]} />
      ))}

      {/* 빌딩들 */}
      {layout.map(({ b, pos }) => (
        <Building
          key={b.ideaId}
          building={b}
          position={pos}
          isNear={b.ideaId === nearBuildingId}
        />
      ))}

      {/* 본인 */}
      <Player
        myName={myName}
        config={myAvatar}
        buildings={buildings}
        layout={layout}
        onPositionChange={sendPosition}
        onEnter={(b) => onEnterBuilding(b.ideaId)}
        onNearBuilding={setNearBuildingId}
      />

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

      <Html fullscreen>
        <div className="pointer-events-none absolute left-4 bottom-20 rounded-lg border border-white/10 bg-black/60 px-4 py-2.5 text-xs text-zinc-200 backdrop-blur">
          <p className="font-semibold">조작</p>
          <p className="mt-0.5 text-zinc-400">WASD 이동 · E 키로 빌딩 입장</p>
        </div>
      </Html>
    </Canvas>
  );
}
