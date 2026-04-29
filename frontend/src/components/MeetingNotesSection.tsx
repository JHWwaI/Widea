"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { readError } from "@/lib/product";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

type Summary = {
  keyPoints?: string[];
  decisions?: string[];
  actions?: Array<{ owner?: string; content?: string }>;
  nextSteps?: string[];
};

type MeetingNote = {
  id: string;
  title: string;
  source: "UPLOAD" | "LIVE_BROWSER" | "BOT";
  durationSec: number | null;
  transcriptText: string;
  summary: Summary | null;
  createdAt: string;
};

type Mode = "idle" | "uploading" | "live-recording" | "saving" | "done";

/* ─────────────────────────────────────────────
   Web Speech API 타입 (브라우저)
   ───────────────────────────────────────────── */
type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type SpeechRecognitionEvent = {
  resultIndex: number;
  results: SpeechRecognitionResult[];
};
type SpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: { new (): SpeechRecognition };
    webkitSpeechRecognition?: { new (): SpeechRecognition };
  }
}

export default function MeetingNotesSection({
  roomCode,
  ideaId,
}: {
  roomCode?: string;
  ideaId?: string;
}) {
  const { token } = useAuth();
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState("");
  const [latestNote, setLatestNote] = useState<MeetingNote | null>(null);
  const [recordingTitle, setRecordingTitle] = useState("");

  // Live recording state
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const liveStartedAtRef = useRef<number>(0);

  /* ─── A. 파일 업로드 ─── */
  async function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setError("");
    setMode("uploading");
    try {
      const fd = new FormData();
      fd.append("audio", file);
      fd.append("title", recordingTitle.trim() || `회의록 ${new Date().toLocaleString("ko-KR")}`);
      if (ideaId) fd.append("ideaId", ideaId);
      if (roomCode) fd.append("roomCode", roomCode);

      const res = await fetch(`${API_BASE}/api/meetings/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "전사 실패");
      }
      const json = (await res.json()) as { note: MeetingNote };
      setLatestNote(json.note);
      setMode("done");
    } catch (caught) {
      setError(readError(caught, "전사·요약 실패"));
      setMode("idle");
    } finally {
      // input value 초기화
      e.target.value = "";
    }
  }

  /* ─── B. 실시간 자막 (Web Speech API) ─── */
  function startLiveRecording() {
    setError("");
    setLiveTranscript("");
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      setError("이 브라우저는 실시간 자막을 지원하지 않습니다. Chrome/Edge 권장.");
      return;
    }
    const recog = new SR();
    recog.lang = "ko-KR";
    recog.continuous = true;
    recog.interimResults = false;
    let acc = "";
    recog.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          acc += (acc ? " " : "") + r[0].transcript;
        }
      }
      setLiveTranscript(acc);
    };
    recog.onerror = (e) => {
      console.error("[live] error:", e.error);
      if (e.error !== "no-speech") {
        setError(`자막 오류: ${e.error}`);
      }
    };
    recog.onend = () => {
      // 자동 종료 시 (예: 무음 길어짐) — 재시작
      if (mode === "live-recording") {
        try { recog.start(); } catch {}
      }
    };
    recog.start();
    recognitionRef.current = recog;
    liveStartedAtRef.current = Date.now();
    setMode("live-recording");
  }

  async function stopLiveRecording() {
    const recog = recognitionRef.current;
    if (recog) {
      recog.onend = null;
      try { recog.stop(); } catch {}
      recognitionRef.current = null;
    }
    if (!liveTranscript || liveTranscript.length < 10) {
      setMode("idle");
      setError("자막이 너무 짧습니다 (10자 이상 필요).");
      return;
    }
    setMode("saving");
    try {
      const durationSec = Math.round((Date.now() - liveStartedAtRef.current) / 1000);
      const res = await fetch(`${API_BASE}/api/meetings/save-live`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcriptText: liveTranscript,
          title: recordingTitle.trim() || `회의록 ${new Date().toLocaleString("ko-KR")}`,
          ideaId,
          roomCode,
          durationSec,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "저장 실패");
      }
      const json = (await res.json()) as { note: MeetingNote };
      setLatestNote(json.note);
      setMode("done");
    } catch (caught) {
      setError(readError(caught, "저장 실패"));
      setMode("idle");
    }
  }

  // unmount cleanup
  useEffect(() => {
    return () => {
      const recog = recognitionRef.current;
      if (recog) {
        recog.onend = null;
        try { recog.stop(); } catch {}
      }
    };
  }, []);

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-violet-300">
            🎙 자동 회의록
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            전사 원본 + AI 요약 둘 다 받아볼 수 있어요
          </p>
        </div>
        <Link href="/collab/meet/notes" className="text-xs font-medium text-zinc-400 hover:text-zinc-200">
          내 회의록 →
        </Link>
      </header>

      {/* 제목 입력 */}
      {mode === "idle" || mode === "live-recording" ? (
        <input
          className="input"
          placeholder="회의 제목 (선택)"
          value={recordingTitle}
          onChange={(e) => setRecordingTitle(e.target.value)}
          disabled={mode === "live-recording"}
        />
      ) : null}

      {/* 모드별 액션 */}
      {mode === "idle" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* A. 업로드 */}
          <label className="group flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-violet-400/40 hover:bg-white/[0.05]">
            <span className="text-2xl">📁</span>
            <span className="text-sm font-bold text-white">녹음 파일 업로드</span>
            <span className="text-xs leading-relaxed text-zinc-400">
              Jitsi 녹화 후 업로드 → Whisper 전사 (정확도 높음)<br/>
              mp3·m4a·wav · 최대 25MB
            </span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={onFilePick}
            />
            <span className="mt-1 text-xs font-semibold text-violet-300">파일 선택 →</span>
          </label>

          {/* B. 실시간 */}
          <button
            type="button"
            onClick={startLiveRecording}
            className="group flex flex-col items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-emerald-400/40 hover:bg-white/[0.05]"
          >
            <span className="text-2xl">🎤</span>
            <span className="text-sm font-bold text-white">실시간 자막</span>
            <span className="text-xs leading-relaxed text-zinc-400">
              지금 마이크로 받아쓰기 (Chrome/Edge)<br/>
              본인 목소리만 캡처됨
            </span>
            <span className="mt-1 text-xs font-semibold text-emerald-300">시작 →</span>
          </button>
        </div>
      ) : null}

      {mode === "uploading" ? (
        <div className="rounded-xl border border-violet-400/30 bg-violet-500/[0.06] p-4 text-sm text-violet-200">
          🔄 Whisper로 전사 중... (1시간 음성 = 약 1분 소요)
        </div>
      ) : null}

      {mode === "live-recording" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            녹음 중 · 자동으로 받아쓰는 중
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 text-sm leading-relaxed text-zinc-200">
            {liveTranscript || <span className="text-zinc-500">아직 음성을 받지 못했습니다...</span>}
          </div>
          <button
            type="button"
            onClick={stopLiveRecording}
            className="w-full rounded-xl bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-400"
          >
            ⏹ 녹음 종료 + 회의록 저장
          </button>
        </div>
      ) : null}

      {mode === "saving" ? (
        <div className="rounded-xl border border-violet-400/30 bg-violet-500/[0.06] p-4 text-sm text-violet-200">
          💾 저장 + AI 요약 중...
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {/* 결과 */}
      {mode === "done" && latestNote ? (
        <NoteResult
          note={latestNote}
          onReset={() => {
            setMode("idle");
            setLatestNote(null);
            setLiveTranscript("");
            setRecordingTitle("");
            setError("");
          }}
        />
      ) : null}
    </section>
  );
}

function NoteResult({ note, onReset }: { note: MeetingNote; onReset: () => void }) {
  const [showFull, setShowFull] = useState(false);
  const s = note.summary ?? null;
  return (
    <div className="space-y-4 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.04] p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-emerald-300">✓ 회의록 생성 완료</p>
          <p className="mt-0.5 text-base font-bold text-white">{note.title}</p>
          <p className="text-xs text-zinc-500">
            {note.source === "UPLOAD" ? "📁 업로드" : note.source === "LIVE_BROWSER" ? "🎤 실시간" : "🤖 봇"}
            {note.durationSec ? ` · ${Math.floor(note.durationSec / 60)}분 ${note.durationSec % 60}초` : ""}
            {" · "}{note.transcriptText.length}자
          </p>
        </div>
        <button type="button" onClick={onReset} className="text-xs text-zinc-400 hover:text-zinc-200">
          새 회의록
        </button>
      </div>

      {/* AI 요약 */}
      {s ? (
        <div className="space-y-3 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-violet-300">
            ✨ AI 요약
          </p>
          {Array.isArray(s.keyPoints) && s.keyPoints.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-zinc-400">핵심 요약</p>
              <ul className="mt-1.5 space-y-1 text-sm text-zinc-200">
                {s.keyPoints.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {Array.isArray(s.decisions) && s.decisions.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-amber-300">✅ 결정 사항</p>
              <ul className="mt-1.5 space-y-1 text-sm text-zinc-200">
                {s.decisions.map((d, i) => (
                  <li key={i}>• {d}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {Array.isArray(s.actions) && s.actions.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-rose-300">📋 액션 아이템</p>
              <ul className="mt-1.5 space-y-1 text-sm text-zinc-200">
                {s.actions.map((a, i) => (
                  <li key={i}>
                    {a.owner ? <span className="text-violet-300">{a.owner}: </span> : null}
                    {a.content}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {Array.isArray(s.nextSteps) && s.nextSteps.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-emerald-300">🔜 다음 단계</p>
              <ul className="mt-1.5 space-y-1 text-sm text-zinc-200">
                {s.nextSteps.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">⚠ AI 요약은 생성되지 않았습니다 (한도 또는 내용 부족).</p>
      )}

      {/* 원본 transcript */}
      <div className="rounded-lg border border-white/10 bg-black/20 p-3">
        <button
          type="button"
          onClick={() => setShowFull((v) => !v)}
          className="flex w-full items-center justify-between text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400 hover:text-zinc-200"
        >
          <span>📜 원본 Transcript</span>
          <span>{showFull ? "접기 ▴" : "펼치기 ▾"}</span>
        </button>
        {showFull ? (
          <pre className="mt-2 max-h-96 overflow-y-auto whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
            {note.transcriptText}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
