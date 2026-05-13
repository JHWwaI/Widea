"use client";

import { useState } from "react";

export type AvatarConfig = {
  bodyColor: string;
  hairColor: string;
  hairStyle: "short" | "long" | "cap" | "none";
};

const BODY_COLORS = [
  "#7C8DFF", "#5DD3D0", "#F5C158", "#F2868E",
  "#A78BFA", "#67D196", "#FB923C", "#94A3B8",
];
const HAIR_COLORS = [
  "#1f1a17", "#3a2418", "#8a4a2a", "#d4a373",
  "#cbcbcb", "#7C8DFF", "#F2868E", "#67D196",
];
const HAIR_STYLES: { value: AvatarConfig["hairStyle"]; label: string }[] = [
  { value: "short", label: "짧은머리" },
  { value: "long",  label: "긴머리" },
  { value: "cap",   label: "캡 모자" },
  { value: "none",  label: "민머리" },
];

export const DEFAULT_AVATAR: AvatarConfig = {
  bodyColor: "#7C8DFF",
  hairColor: "#1f1a17",
  hairStyle: "short",
};

export function loadAvatar(): AvatarConfig {
  if (typeof window === "undefined") return DEFAULT_AVATAR;
  try {
    const raw = localStorage.getItem("widea_avatar");
    if (!raw) return DEFAULT_AVATAR;
    const cfg = JSON.parse(raw) as AvatarConfig;
    return { ...DEFAULT_AVATAR, ...cfg };
  } catch {
    return DEFAULT_AVATAR;
  }
}

export function saveAvatar(cfg: AvatarConfig): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem("widea_avatar", JSON.stringify(cfg)); } catch { /* ignore */ }
}

function PreviewAvatar({ cfg }: { cfg: AvatarConfig }) {
  return (
    <div className="relative h-48 w-32 rounded-2xl border border-white/10 bg-zinc-900/50">
      <svg viewBox="0 0 128 192" className="h-full w-full">
        {/* hair behind */}
        {cfg.hairStyle === "long" ? (
          <ellipse cx="64" cy="62" rx="32" ry="38" fill={cfg.hairColor} />
        ) : null}
        {/* head */}
        <circle cx="64" cy="58" r="22" fill="#f1d5be" />
        {/* hair top */}
        {cfg.hairStyle === "short" ? (
          <path d="M42 56 Q64 28 86 56 Q86 44 64 38 Q42 44 42 56 Z" fill={cfg.hairColor} />
        ) : null}
        {cfg.hairStyle === "long" ? (
          <path d="M44 56 Q64 28 84 56 Q84 44 64 38 Q44 44 44 56 Z" fill={cfg.hairColor} />
        ) : null}
        {cfg.hairStyle === "cap" ? (
          <>
            <ellipse cx="64" cy="42" rx="26" ry="14" fill={cfg.hairColor} />
            <rect x="38" y="44" width="52" height="6" fill={cfg.hairColor} />
            <rect x="78" y="44" width="20" height="4" fill={cfg.hairColor} opacity="0.7" />
          </>
        ) : null}
        {/* eyes */}
        <circle cx="56" cy="60" r="2" fill="#222" />
        <circle cx="72" cy="60" r="2" fill="#222" />
        {/* body */}
        <rect x="42" y="84" width="44" height="60" rx="14" fill={cfg.bodyColor} />
        {/* legs */}
        <rect x="48" y="140" width="12" height="36" rx="4" fill="#3a3a44" />
        <rect x="68" y="140" width="12" height="36" rx="4" fill="#3a3a44" />
      </svg>
    </div>
  );
}

export default function AvatarCustomizer({
  onConfirm,
  initial,
}: {
  onConfirm: (cfg: AvatarConfig) => void;
  initial?: AvatarConfig;
}) {
  const [cfg, setCfg] = useState<AvatarConfig>(initial ?? DEFAULT_AVATAR);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <header className="mb-4">
          <h2 className="text-lg font-semibold text-white">아바타 만들기</h2>
          <p className="mt-1 text-xs text-zinc-500">
            가상 사무실에 입장하기 전 본인 아바타를 꾸며보세요.
          </p>
        </header>

        <div className="grid grid-cols-[auto_1fr] gap-5">
          <div className="flex items-start justify-center">
            <PreviewAvatar cfg={cfg} />
          </div>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-300">옷 색</p>
              <div className="flex flex-wrap gap-1.5">
                {BODY_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCfg({ ...cfg, bodyColor: c })}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                      cfg.bodyColor === c ? "ring-2 ring-white" : "ring-1 ring-white/10"
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-300">머리/모자 색</p>
              <div className="flex flex-wrap gap-1.5">
                {HAIR_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCfg({ ...cfg, hairColor: c })}
                    className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                      cfg.hairColor === c ? "ring-2 ring-white" : "ring-1 ring-white/10"
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-zinc-300">스타일</p>
              <div className="grid grid-cols-2 gap-1.5">
                {HAIR_STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setCfg({ ...cfg, hairStyle: s.value })}
                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      cfg.hairStyle === s.value
                        ? "border-white/40 bg-white/[0.08] text-white"
                        : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              saveAvatar(cfg);
              onConfirm(cfg);
            }}
            className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            입장하기
          </button>
        </div>
      </div>
    </div>
  );
}
