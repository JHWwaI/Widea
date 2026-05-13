"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { readError } from "@/lib/product";

type IdeaOption = { id: string; titleKo: string };

export default function SendCollabRequestButton({
  expertUserId,
}: {
  expertUserId: string;
}) {
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [ideas, setIdeas] = useState<IdeaOption[]>([]);
  const [ideaId, setIdeaId] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const loadIdeas = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api<{ sessions: Array<{ generatedIdeas: IdeaOption[] }> }>(
        "GET",
        "/api/idea-match/sessions",
        undefined,
        token,
      );
      const flat = res.sessions.flatMap((s) => s.generatedIdeas ?? []);
      setIdeas(flat);
      if (flat.length > 0) setIdeaId(flat[0].id);
    } catch {
      // 아이디어 목록 조회 실패 시 빈 목록 유지
    }
  }, [token]);

  useEffect(() => {
    if (open) loadIdeas();
  }, [open, loadIdeas]);

  if (!user || user.id === expertUserId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !ideaId) return;
    setSubmitting(true);
    setError("");
    try {
      await api(
        "POST",
        `/api/workspace/${ideaId}/collab-requests`,
        { expertUserId, message: message.trim() || undefined },
        token,
      );
      setDone(true);
    } catch (caught) {
      setError(readError(caught, "요청 전송 실패"));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200">
        협업 요청이 전송되었습니다. 전문가가 수락하면 워크스페이스에 초대됩니다.
      </div>
    );
  }

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-violet-400/40 bg-violet-500/10 px-5 py-2.5 text-sm font-semibold text-violet-200 hover:bg-violet-500/20"
        >
          워크스페이스 협업 요청 →
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-violet-400/30 bg-violet-500/[0.05] p-4"
        >
          <p className="text-sm font-semibold text-violet-200">워크스페이스 협업 요청</p>

          {error ? (
            <p className="text-xs text-rose-300">{error}</p>
          ) : null}

          {ideas.length === 0 ? (
            <p className="text-xs text-zinc-500">연결할 아이디어가 없습니다. 먼저 아이디어를 생성해주세요.</p>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs text-zinc-400">연결할 아이디어</label>
                <select
                  value={ideaId}
                  onChange={(e) => setIdeaId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-200"
                >
                  {ideas.map((idea) => (
                    <option key={idea.id} value={idea.id}>
                      {idea.titleKo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-zinc-400">메시지 (선택)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="협업하고 싶은 이유나 역할을 간단히 설명해주세요."
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-violet-400/60 resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
                >
                  {submitting ? "전송 중..." : "요청 보내기"}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  취소
                </button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}
