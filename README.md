# Widea — AI 한국 창업 워크스페이스

> 검증된 글로벌 사례 RAG로 한국형 사업 아이디어를 만들고, 6단계 워크스페이스로 실행까지 끌고 갑니다.

---

## 한 줄 정의

20개 카테고리 · 100개 글로벌 검증 기업 시드(Pinecone)에서 의미 검색해 **본인 산업·예산·팀 규모에 맞춘 한국형 사업 아이디어 3개**를 생성하고, 선정한 아이디어를 **6단계 33개 default task** 워크스페이스로 자동 변환해 실행까지 안내합니다.

---

## 핵심 기능

### 1. RAG 기반 아이디어 매칭 (`/idea-match`)
- Pinecone topK=5 의미 검색 → Gemini Flash JSON 생성 → 후처리 (화이트리스트·금지 어휘 차단)
- 4단계 LLM 폴백: `gemini-2.5-flash` → `2.0-flash` → `flash-latest` → **Groq Llama 3.3 70B**
- 5단계 JSON repair (brace counting, escape 복구, 부속 텍스트 제거)

### 2. 프로젝트 분석 (`/ideas/[id]`)
- 해외 벤치마크 유사도·MVP 기능·심층 리포트 (블러·페이 패턴)
- 무료 미리보기 → 8 크레딧 결제 → 잠금 해제 (`prisma.$transaction` 안전 차감)

### 3. 워크스페이스 (`/workspace/[ideaId]`)
- **6단계** (서류·팀·기획·개발·배포·마케팅) × **15 핵심 + 18 선택 task**
- **Focus mode**: 한 번에 한 task — 왜 중요한가 + 어떻게 시작하나 + 도움되는 도구 자동 추천
- **3-허브** (외주·AC 컨설팅·팀 모집) → 커뮤니티 글 자동 작성 → 응답 받기

### 4. 자동 회의록 (`/collab/meet`)
- A) 녹음 파일 업로드 → Whisper Large v3 Turbo (Groq)
- B) 실시간 자막 → Web Speech API
- 원본 transcript + AI 요약 4영역 (핵심·결정·액션·다음) 둘 다 보존

### 5. 공개 사업 페이지 (`/show/[ideaId]`)
- 아이디어 → MVP 기능 → 한국 시장 타이밍 → 진척률 → CTA
- "Powered by Widea" 푸터 (바이럴 루프)

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| **Frontend** | Next.js 16 App Router · Tailwind · Pretendard 한글 타이포 |
| **Backend** | Express · Prisma ORM · TypeScript |
| **DB** | PostgreSQL (Neon) |
| **Vector** | Pinecone (Gemini text-embedding-004) |
| **LLM** | Gemini 2.5 Flash + Groq Llama 70B 폴백 |
| **음성** | Whisper Large v3 Turbo + Web Speech API |
| **결제** | Toss Payments |
| **회의** | Jitsi (임베드) |

---

## 실행 — 로컬 개발

### 사전 요구사항
- Node 20+
- PostgreSQL (또는 Neon 계정)
- 환경변수: `GEMINI_API_KEY`, `GROQ_API_KEY`, `PINECONE_API_KEY`, `JWT_SECRET` 등 (`.env.example` 참고)

### 1. 의존성 설치
```bash
# 백엔드
npm install
# 프론트엔드
cd frontend && npm install
```

### 2. 환경변수 설정
```bash
cp .env.example .env
# .env 열어서 실제 키 입력
```

### 3. DB 마이그레이션 + 시드
```bash
npx prisma migrate deploy
npm run import_benchmarks      # 100개 글로벌 사례 시드
npm run sync                   # Pinecone 동기화
```

### 4. 서버 실행 (각각 다른 터미널)
```bash
# 백엔드 (3001)
npm run dev

# 프론트엔드 (3000)
cd frontend && npm run dev
```

브라우저에서 http://localhost:3000 접속.

---

## 운영 배포

- **백엔드** — Render / Railway / Fly.io (Express는 풀 서버 필요, Vercel 서버리스는 LLM 30초 호출 대응 X)
- **프론트엔드** — Vercel (Next.js 네이티브)
- **DB** — Neon · Supabase · Railway Postgres
- 배포 설정 파일: `Procfile`, `railway.json`, `render.yaml`, 루트 `index.js` 부트스트랩

자세한 가이드는 `.env.example` 참고.

---

## 디렉토리 구조

```
.
├── src/                       # 백엔드 (Express)
│   ├── server.ts             # 진입점 + 미들웨어 + 라우트 등록
│   ├── routes/               # /api/* 라우트 핸들러
│   │   ├── ideaMatch.ts      # RAG 아이디어 생성 + 심층 리포트 + artifacts
│   │   ├── workspace.ts      # 워크스페이스 + task CRUD
│   │   ├── meetings.ts       # 회의록 (Whisper + 요약)
│   │   ├── show.ts           # 공개 사업 페이지
│   │   └── ...
│   ├── lib/                  # 공통 헬퍼
│   │   ├── geminiChat.ts    # 4단계 LLM 폴백 체인
│   │   ├── workspace.ts     # 워크스페이스 시드 함수
│   │   └── ...
│   └── data/
│       ├── benchmarks/       # 100개 글로벌 사례 seed.jsonl
│       ├── workspaceTemplate.ts  # 6단계 33개 default task
│       └── govPrograms.ts    # 정부지원사업 메타
├── frontend/                  # Next.js 16 App Router
│   └── src/
│       ├── app/              # 페이지 라우트
│       │   ├── idea-match/  # 아이디어 매칭 폼·결과
│       │   ├── ideas/[id]/  # 프로젝트 분석 (벤치마크·심층 리포트)
│       │   ├── workspace/[ideaId]/  # 워크스페이스 + Focus mode
│       │   ├── community/   # 카테고리 게시판
│       │   ├── collab/meet/ # Jitsi 회의 + 회의록
│       │   ├── show/[ideaId]/  # 공개 사업 페이지
│       │   └── ...
│       ├── components/
│       │   ├── workspace/   # FocusMode·StageDetail·OutsourceModal
│       │   ├── mypage/      # FounderHome·AcceleratorHome·InvestorHome
│       │   └── ...
│       └── lib/             # api.ts·product.ts·types.ts
├── prisma/
│   ├── schema.prisma        # User·GeneratedIdea·WorkspaceStage 등
│   └── migrations/          # 18개 마이그레이션
└── scripts/                  # 시드·관리 스크립트
```

---

## 차별점

1. **검증 사례 RAG** — 추측 아닌 실제 글로벌 회사 (Notion·Patch·Maven Clinic 등 100건)
2. **한국 컨텍스트 룰** — 홈택스·토스뱅크 등 실제 도구 추천 + "혁신·고도화" 같은 컨설턴트 어휘 자동 차단
3. **블러·페이 UX** — 가치를 먼저 보여주고 잠금 해제 (결제 후 결과 만드는 패턴 X)
4. **3-허브 통합** — 외주·AC 컨설팅·팀 모집 모두 워크스페이스에서 한 번에 진입 (별도 페이지 X)

---

## 개발 정보

- 라이선스: ISC
- 메인테이너: [@JHWwaI](https://github.com/JHWwaI)
- 이슈/제안: GitHub Issues

---

## Roadmap

- [ ] RAG 시드 100 → 400건 (한국 로컬 사례 100건 신규 추가)
- [ ] 임베딩 매칭 — task → 외주자·AC·투자자 자동 추천
- [ ] 외주 에스크로 (Toss 확장)
- [ ] og:image 자동 생성 (`/show` SEO)
- [ ] 모바일 검수 + Sentry 도입
