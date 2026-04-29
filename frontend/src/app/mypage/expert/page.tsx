"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import { LoadingState } from "@/components/ProductUI";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

type ExpertCategory =
  | "DEVELOPER"
  | "DESIGNER"
  | "MARKETER"
  | "AC_MENTOR"
  | "PLANNER"
  | "PM"
  | "OTHER";

const CATEGORY_OPTIONS: Array<{ value: ExpertCategory; label: string }> = [
  { value: "DEVELOPER", label: "개발자" },
  { value: "DESIGNER", label: "디자이너" },
  { value: "PLANNER", label: "기획자" },
  { value: "PM", label: "PM" },
  { value: "MARKETER", label: "마케터" },
  { value: "AC_MENTOR", label: "AC·멘토" },
  { value: "OTHER", label: "기타" },
];

type Profile = {
  category: ExpertCategory;
  headline: string;
  bio: string;
  skills: string[];
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  links: Array<{ label: string; url: string }>;
  location: string | null;
  available: boolean;
};

const EMPTY: Profile = {
  category: "DEVELOPER",
  headline: "",
  bio: "",
  skills: [],
  hourlyRateMin: null,
  hourlyRateMax: null,
  links: [],
  location: "",
  available: true,
};

export default function ExpertEditPage() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<Profile>(EMPTY);
  const [skillInput, setSkillInput] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api<{ profile: Profile | null }>("GET", "/api/experts/me", undefined, token)
      .then((res) => {
        if (cancelled) return;
        if (res.profile) {
          setForm({
            ...res.profile,
            skills: Array.isArray(res.profile.skills) ? res.profile.skills : [],
            links: Array.isArray(res.profile.links) ? res.profile.links : [],
            location: res.profile.location ?? "",
          });
        }
      })
      .catch((caught) => { if (!cancelled) setError(readError(caught, "프로필 불러오기 실패")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  function addSkill() {
    const s = skillInput.trim();
    if (!s || form.skills.includes(s)) return;
    setForm({ ...form, skills: [...form.skills, s] });
    setSkillInput("");
  }
  function removeSkill(s: string) {
    setForm({ ...form, skills: form.skills.filter((x) => x !== s) });
  }
  function addLink() {
    const label = linkLabel.trim();
    const url = linkUrl.trim();
    if (!label || !url) return;
    setForm({ ...form, links: [...form.links, { label, url }] });
    setLinkLabel("");
    setLinkUrl("");
  }
  function removeLink(idx: number) {
    setForm({ ...form, links: form.links.filter((_, i) => i !== idx) });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api("PUT", "/api/experts/me", form, token);
      setSuccess("저장되었습니다. /talent 페이지에 반영됩니다.");
      setTimeout(() => {
        if (user?.id) router.push(`/u/${user.id}`);
      }, 700);
    } catch (caught) {
      setError(readError(caught, "저장 실패"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-[40vh] items-center justify-center">
          <LoadingState label="불러오는 중..." />
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="mx-auto max-w-2xl space-y-6 fade-up pb-12">
        <header className="space-y-2">
          <Link href="/mypage" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← 마이페이지
          </Link>
          <p className="eyebrow">전문가 프로필</p>
          <h1 className="editorial-h2 text-white">내 프로필 등록·수정</h1>
          <p className="text-sm text-zinc-400">
            등록하면 /talent 그리드에 노출되어 다른 사용자가 직접 컨택할 수 있습니다.
          </p>
        </header>

        {error ? (
          <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 카테고리 */}
          <div>
            <label className="field-label">주요 카테고리 *</label>
            <select
              className="select"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpertCategory })}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* 한 줄 소개 */}
          <div>
            <label className="field-label">한 줄 소개 * (5자 이상)</label>
            <input
              className="input"
              placeholder="예: React·Next.js 풀스택 5년차, 핀테크/B2B SaaS 경험"
              value={form.headline}
              onChange={(e) => setForm({ ...form, headline: e.target.value })}
              maxLength={120}
            />
          </div>

          {/* 자세한 소개 */}
          <div>
            <label className="field-label">자세한 소개 * (10자 이상, 마크다운 가능)</label>
            <textarea
              className="textarea min-h-[180px]"
              placeholder="해온 프로젝트, 강점, 협업 스타일 등을 자유롭게 적어주세요."
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          {/* 스킬 태그 */}
          <div>
            <label className="field-label">스킬 태그</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="예: React, TypeScript, Figma"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
              />
              <button type="button" onClick={addSkill} className="btn-secondary px-4 py-2 text-sm">
                추가
              </button>
            </div>
            {form.skills.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {form.skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="rounded bg-violet-500/10 px-2 py-0.5 text-xs text-violet-200 ring-1 ring-violet-400/20 hover:bg-rose-500/10 hover:text-rose-200 hover:ring-rose-400/30"
                    title="클릭해서 제거"
                  >
                    {s} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* 시급 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">시급 최소 (원)</label>
              <input
                type="number"
                className="input"
                placeholder="50000"
                value={form.hourlyRateMin ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hourlyRateMin: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
            <div>
              <label className="field-label">시급 최대 (원)</label>
              <input
                type="number"
                className="input"
                placeholder="100000"
                value={form.hourlyRateMax ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hourlyRateMax: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </div>
          </div>

          {/* 위치 */}
          <div>
            <label className="field-label">위치</label>
            <input
              className="input"
              placeholder="예: 서울, 부산, 원격"
              value={form.location ?? ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>

          {/* 링크 */}
          <div>
            <label className="field-label">포트폴리오·링크</label>
            <div className="flex gap-2">
              <input
                className="input w-32"
                placeholder="라벨 (GitHub)"
                value={linkLabel}
                onChange={(e) => setLinkLabel(e.target.value)}
              />
              <input
                className="input flex-1"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
              />
              <button type="button" onClick={addLink} className="btn-secondary px-4 py-2 text-sm">
                추가
              </button>
            </div>
            {form.links.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {form.links.map((l, i) => (
                  <li
                    key={`${l.url}-${i}`}
                    className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs"
                  >
                    <span>
                      <span className="font-bold text-white">{l.label}</span>
                      <span className="ml-2 text-zinc-500">{l.url}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="text-rose-300 hover:text-rose-200"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* 활동 여부 */}
          <div className="flex items-center gap-2">
            <input
              id="available"
              type="checkbox"
              checked={form.available}
              onChange={(e) => setForm({ ...form, available: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="available" className="text-sm text-zinc-300">
              영입 가능 (체크 해제 시 그리드에서 숨김)
            </label>
          </div>

          {/* 저장 */}
          <div className="flex gap-2 pt-4">
            <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5">
              {saving ? "저장 중..." : "저장"}
            </button>
            <Link href="/talent" className="btn-ghost px-6 py-2.5">
              취소
            </Link>
          </div>
        </form>
      </div>
    </AuthGuard>
  );
}
