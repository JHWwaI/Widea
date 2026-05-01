import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="display-num text-7xl text-white/[0.18]">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">페이지를 찾을 수 없습니다</h1>
        <p className="text-sm text-zinc-400">
          주소가 잘못됐거나 페이지가 이동됐을 수 있습니다.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
        >
          홈으로
        </Link>
        <Link
          href="/mypage"
          className="rounded-md border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-zinc-200 hover:border-white/20 hover:bg-white/[0.06]"
        >
          내 프로젝트
        </Link>
      </div>
    </div>
  );
}
