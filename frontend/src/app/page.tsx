import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Widea</h1>
          <div className="flex gap-3">
            <Link href="/login" className="px-4 py-1.5 text-gray-700 hover:text-gray-900 text-sm font-medium">
              로그인
            </Link>
            <Link href="/register" className="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 py-20 md:py-32">
        <div className="space-y-8 text-center max-w-3xl mx-auto">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
              세계의 성공 사례
            </h2>
            <p className="text-3xl md:text-4xl font-semibold text-emerald-600">
              한국의 현실로
            </p>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            글로벌 사례를 분석하고, 한국 시장에 맞는 실행 전략을 만드는 AI 창업 도구
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/register" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors">
              무료로 시작
            </Link>
            <Link href="/login" className="px-8 py-3 border-2 border-gray-300 text-gray-900 rounded-lg hover:border-gray-400 font-semibold transition-colors">
              로그인
            </Link>
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-max">
          {/* Discovery - Large Card */}
          <div className="md:col-span-2 md:row-span-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-8 border border-blue-200 hover:shadow-lg transition-shadow">
            <div className="space-y-4">
              <div className="inline-block px-3 py-1 bg-blue-200 text-blue-900 text-xs font-semibold rounded-full">
                글로벌 시장 분석
              </div>
              <h3 className="text-3xl font-bold text-gray-900">Discovery</h3>
              <p className="text-gray-700 text-lg">
                세계의 성공한 스타트업 사례를 검색하고, 당신의 시장에서 벤치마크할 사례를 찾으세요.
              </p>
              <div className="pt-4 text-sm text-blue-700 font-semibold flex items-center gap-2">
                → 알아보기
              </div>
            </div>
          </div>

          {/* Blueprint */}
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl p-8 border border-emerald-200 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div className="inline-block px-3 py-1 bg-emerald-200 text-emerald-900 text-xs font-semibold rounded-full">
                한국형 전략
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Blueprint</h3>
              <p className="text-gray-700 text-sm">
                글로벌 사례를 한국 시장의 현실로 변환하는 실행 전략을 생성합니다.
              </p>
            </div>
          </div>

          {/* Idea Match */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-8 border border-amber-200 hover:shadow-lg transition-shadow">
            <div className="space-y-3">
              <div className="inline-block px-3 py-1 bg-amber-200 text-amber-900 text-xs font-semibold rounded-full">
                맞춤형 제안
              </div>
              <h3 className="text-2xl font-bold text-gray-900">Idea Match</h3>
              <p className="text-gray-700 text-sm">
                팀의 역량과 예산에 맞는 현실적인 아이디어를 받으세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-6xl mx-auto px-6 py-20 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div className="space-y-2">
            <p className="text-3xl font-bold text-blue-600">500+</p>
            <p className="text-sm text-gray-600">글로벌 사례</p>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-emerald-600">10K+</p>
            <p className="text-sm text-gray-600">한국형 전략</p>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-amber-600">200+</p>
            <p className="text-sm text-gray-600">팀 사용 중</p>
          </div>
          <div className="space-y-2">
            <p className="text-3xl font-bold text-purple-600">24/7</p>
            <p className="text-sm text-gray-600">AI 지원</p>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="space-y-6 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold">지금 시작하세요</h3>
          <p className="text-lg opacity-90">가입 즉시 50 크레딧으로 모든 기능을 체험해보세요</p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/register" className="px-8 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold transition-colors">
              무료 가입
            </Link>
            <Link href="/login" className="px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 font-semibold transition-colors">
              로그인
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
