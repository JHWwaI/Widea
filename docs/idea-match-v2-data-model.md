# Idea Match V2 Data Model

## Goal

Idea Match를 `한국어로`, `더 구체적으로`, `재사용 가능한 제품 데이터`로 만들기 위한 데이터 구조 초안이다.

현재 구조의 핵심 한계:

- `ProjectPolicy`는 꽤 풍부하지만, 벤치마크 원천 데이터가 얇다.
- `GlobalCaseMeta`는 검색용 메타데이터 위주라 한국형 상세 생성 근거가 부족하다.
- `IdeaMatchSession.localizedIdeas`가 통째 JSON이라 비교, 수정, 저장, 랭킹, 필터링이 어렵다.
- 한국 시장 근거 데이터가 독립된 엔티티가 아니라 프롬프트 안에서만 암묵적으로 처리된다.

목표 구조:

1. `글로벌 사례 구조화`
2. `한국 시장 신호 구조화`
3. `생성 결과를 아이디어 단위 엔티티로 저장`

---

## Design Principles

- 키는 영어로 유지하고, 모델이 채우는 값은 한국어로 생성한다.
- 완전 정규화보다 `핵심 필터 컬럼 + 상세 JSON` 혼합 구조를 쓴다.
- 기존 `localizedIdeas` JSON은 바로 제거하지 않고, 호환 레이어로 유지한다.
- 먼저 저장하고 다시 읽을 수 있게 만든 뒤, 그 다음에 품질 고도화를 한다.

---

## Recommended Schema Direction

### 1. Keep

기존에 유지할 모델:

- `ProjectPolicy`
- `GlobalCaseMeta`
- `IdeaMatchSession`

### 2. Add

새로 추가할 모델:

- `GlobalCaseProfile`
- `KoreanMarketSignal`
- `GeneratedIdea`

선택적 2차 확장:

- `GeneratedIdeaBenchmark`
- `GeneratedIdeaFeedback`

---

## Prisma Draft

아래는 실제 적용용 초안이다. 바로 복붙 후 미세조정 가능한 수준으로 작성한다.

```prisma
enum ComplexityLevel {
  LOW
  MEDIUM
  HIGH
}

enum EvidenceType {
  REPORT
  ARTICLE
  INTERVIEW
  INTERNAL_NOTE
  MANUAL_RESEARCH
}

enum IdeaStatus {
  DRAFT
  SHORTLISTED
  SELECTED
  ARCHIVED
}

model GlobalCaseProfile {
  id String @id @default(uuid())

  globalCaseMetaId String @unique @map("global_case_meta_id")
  globalCaseMeta   GlobalCaseMeta @relation(fields: [globalCaseMetaId], references: [id], onDelete: Cascade)

  summaryKo           String? @map("summary_ko") @db.Text
  oneLinerKo          String? @map("one_liner_ko")
  targetCustomerKo    String? @map("target_customer_ko") @db.Text
  customerPainKo      String? @map("customer_pain_ko") @db.Text
  solutionKo          String? @map("solution_ko") @db.Text
  coreWorkflowKo      String? @map("core_workflow_ko") @db.Text
  pricingSummaryKo    String? @map("pricing_summary_ko") @db.Text
  gtmMotionKo         String? @map("gtm_motion_ko") @db.Text
  acquisitionChannels Json?   @map("acquisition_channels")
  keywords            Json?
  moatKo              String? @map("moat_ko") @db.Text
  techComplexity      ComplexityLevel? @map("tech_complexity")
  opsComplexity       ComplexityLevel? @map("ops_complexity")
  regulatoryTags      Json? @map("regulatory_tags")
  koreanFitNotesKo    String? @map("korean_fit_notes_ko") @db.Text
  sourceConfidence    Int? @map("source_confidence")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([techComplexity])
  @@index([opsComplexity])
  @@map("global_case_profiles")
}

model KoreanMarketSignal {
  id String @id @default(uuid())

  industry          String
  customerSegment   String @map("customer_segment")
  problemSummaryKo  String @map("problem_summary_ko") @db.Text
  marketContextKo   String? @map("market_context_ko") @db.Text
  localCompetitors  Json? @map("local_competitors")
  channelFit        Json? @map("channel_fit")
  willingnessToPay  String? @map("willingness_to_pay")
  regulationSummary String? @map("regulation_summary") @db.Text
  regulationTags    Json? @map("regulation_tags")
  evidenceType      EvidenceType @default(MANUAL_RESEARCH) @map("evidence_type")
  evidenceSource    String? @map("evidence_source")
  sourceUrl         String? @map("source_url")
  signalScore       Int? @map("signal_score")
  updatedAtSource   DateTime? @map("updated_at_source")

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([industry])
  @@index([customerSegment])
  @@index([updatedAtSource])
  @@map("korean_market_signals")
}

model GeneratedIdea {
  id String @id @default(uuid())

  sessionId String @map("session_id")
  session   IdeaMatchSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  rank Int
  status IdeaStatus @default(DRAFT)

  titleKo           String @map("title_ko")
  oneLinerKo        String @map("one_liner_ko") @db.Text
  summaryKo         String @map("summary_ko") @db.Text
  whyNowInKoreaKo   String @map("why_now_in_korea_ko") @db.Text
  marketFitScore    Int @map("market_fit_score")
  confidenceScore   Int? @map("confidence_score")

  sourceBenchmarkIds Json? @map("source_benchmark_ids")
  sourceBenchmarksKo Json? @map("source_benchmarks_ko")

  targetCustomer Json? @map("target_customer")
  problemDetail  Json? @map("problem_detail")
  businessModel  Json? @map("business_model")
  mvpScope       Json? @map("mvp_scope")
  goToMarket     Json? @map("go_to_market")
  executionPlan  Json? @map("execution_plan")
  estimatedCost  Json? @map("estimated_cost")
  risks          Json?

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([sessionId])
  @@index([rank])
  @@index([status])
  @@index([marketFitScore])
  @@map("generated_ideas")
}
```

---

## Minimal Changes To Existing Models

기존 모델에도 아래 정도는 추가하는 편이 좋다.

### `GlobalCaseMeta`

추천 추가 컬럼:

- `targetMarket String?`
- `region String?`
- `companyStage String?`
- `companyStatus String?`
- `summaryKo String?`

이유:

- 검색 필터를 더 안정적으로 만들 수 있다.
- `GlobalCaseProfile` 상세가 없어도 최소한의 카드 렌더링이 가능하다.

### `IdeaMatchSession`

추천 추가 컬럼:

- `locale String @default("ko-KR")`
- `generationVersion String?`
- `summaryKo String?`
- `selectedIdeaId String?`

이유:

- 어떤 프롬프트 버전으로 생성됐는지 추적할 수 있다.
- 세션 목록에서 대표 아이디어나 요약을 보여주기 쉬워진다.

---

## Idea Match V2 Output JSON Spec

핵심 원칙:

- 키는 프론트/백엔드 호환을 위해 camelCase 영어 유지
- 값은 한국어로 생성
- 프론트가 바로 카드/상세 패널에 쓸 수 있도록 깊이를 적당히 제한

```json
{
  "ideas": [
    {
      "rank": 1,
      "titleKo": "AI 기반 글로벌 채용협업 자동화 솔루션",
      "oneLinerKo": "해외 채용 파이프라인과 협업 커뮤니케이션을 한 화면에서 처리하는 B2B SaaS",
      "summaryKo": "국내 초기 SaaS 팀이 해외 인재 채용과 인터뷰 운영 과정에서 겪는 비효율을 줄이는 운영형 솔루션이다.",
      "whyNowInKoreaKo": "국내 스타트업의 해외 개발자 채용 수요와 원격 협업 수요가 함께 늘고 있어 실행 타이밍이 좋다.",
      "marketFitScore": 88,
      "confidenceScore": 81,
      "sourceBenchmarks": [
        {
          "globalCaseId": "uuid",
          "companyName": "Ashby",
          "whyReferencedKo": "채용 운영 워크플로 설계 방식 참고"
        },
        {
          "globalCaseId": "uuid",
          "companyName": "Deel",
          "whyReferencedKo": "글로벌 인재 운영 구조 참고"
        }
      ],
      "targetCustomer": {
        "personaKo": "10~50인 SaaS 스타트업 COO 또는 채용 담당자",
        "corePainKo": "채용 협업과 인터뷰 운영이 여러 툴에 흩어져 있다",
        "urgencyKo": "즉시 도입 가능",
        "buyingTriggerKo": "채용 건수가 월 3건 이상 발생할 때"
      },
      "problemDetail": {
        "currentWorkflowKo": "노션, 슬랙, 구글시트, 이메일을 오가며 후보자 상태를 수동 관리",
        "failureCostKo": "후보자 이탈, 일정 누락, 채용 리드타임 증가"
      },
      "businessModel": {
        "modelKo": "팀 구독형 SaaS",
        "pricingKo": "월 19만~49만원",
        "expansionKo": "채용 대행사/리크루터용 상위 플랜"
      },
      "mvpScope": {
        "coreFeatures": [
          "지원자 파이프라인 보드",
          "면접 일정 자동화",
          "협업 메모 통합",
          "후보자 상태 요약 리포트"
        ],
        "excludeForNow": [
          "급여/계약 자동화",
          "ATS 전체 대체"
        ]
      },
      "goToMarket": {
        "primaryChannelKo": "국내 SaaS 창업자 커뮤니티 직접 세일즈",
        "secondaryChannelsKo": [
          "채용 컨설턴트 제휴",
          "링크드인 콘텐츠"
        ],
        "first10CustomersKo": "기존 네트워크 기반 파일럿 10팀 확보"
      },
      "executionPlan": [
        {
          "phase": "30days",
          "goalKo": "파일럿 고객 3팀 확보",
          "actionsKo": [
            "문제 인터뷰 15건",
            "수기 운영형 MVP 배포"
          ],
          "kpiKo": "유료 의향 인터뷰 5건"
        },
        {
          "phase": "60days",
          "goalKo": "핵심 협업 기능 고도화",
          "actionsKo": [
            "인터뷰 일정 자동화 추가",
            "리포트 대시보드 추가"
          ],
          "kpiKo": "주간 활성 팀 5개"
        }
      ],
      "estimatedCost": {
        "buildKo": "초기 500만~1200만원",
        "opsKo": "월 100만~250만원",
        "notesKo": "초기에는 수기 운영을 섞어 비용을 낮출 수 있음"
      },
      "risks": [
        {
          "riskKo": "기존 ATS 대비 기능이 얕아 보일 수 있음",
          "impact": "HIGH",
          "mitigationKo": "전체 ATS가 아니라 채용 협업 운영툴로 포지셔닝"
        }
      ]
    }
  ]
}
```

---

## Why This Output Works Better

- 카드에 바로 필요한 필드가 따로 있다.
- 한국어 UI에 그대로 꽂을 수 있다.
- `GeneratedIdea` 테이블에 거의 1:1 저장이 가능하다.
- 나중에 “저장”, “선택”, “비교”, “실행계획 보기”로 확장하기 쉽다.

---

## API Strategy

### Current

- `POST /api/idea-match`
- 세션 1개 생성
- `localizedIdeas` JSON 저장

### V2 Recommended

`POST /api/idea-match` 응답은 유지하되, 내부 저장만 바꾼다.

1. `IdeaMatchSession` 생성
2. `GeneratedIdea[]` 함께 생성
3. 응답은 아래 두 가지를 함께 지원

```json
{
  "sessionId": "uuid",
  "matchedCasesCount": 5,
  "creditUsed": 10,
  "creditBalance": 40,
  "localizedIdeas": {
    "ideas": []
  },
  "generatedIdeas": []
}
```

권장:

- 단기에는 `localizedIdeas` 유지
- 프론트는 점진적으로 `generatedIdeas` 우선 사용

---

## Migration Order

### Phase 1. Safe Schema Add

추가만 하고 기존 동작은 그대로 둔다.

- `GlobalCaseProfile`
- `KoreanMarketSignal`
- `GeneratedIdea`
- `IdeaMatchSession.locale`
- `IdeaMatchSession.generationVersion`

이 단계에서는 기존 API/프론트 변경 없음.

### Phase 2. Import / Seed Upgrade

데이터 수집 스크립트를 확장한다.

- `scripts/import_real_startups.ts`에서 `GlobalCaseProfile`까지 채우기
- 국내 시장 신호는 초기엔 수작업 seed로 시작
- 산업별 20~30개 신호만 먼저 넣어도 품질 차이가 크다

### Phase 3. Prompt V2

`buildIdeaMatchPrompt`를 V2 JSON 스펙 기준으로 바꾼다.

규칙:

- 출력 언어는 한국어
- 키는 camelCase 영어
- 값은 구체적이고 실행형
- 각 아이디어는 최소 1개의 벤치마크를 명시

### Phase 4. Dual Write

기존 세션 JSON과 새 엔티티를 동시에 저장한다.

- `IdeaMatchSession.localizedIdeas` 저장 유지
- `GeneratedIdea`도 같이 저장

이 단계가 중요하다.

- 장애 시 복구 쉽다
- 프론트 이행 중에도 안전하다

### Phase 5. Read Path Migration

프론트/API 읽기 우선순위를 바꾼다.

1. `generatedIdeas`가 있으면 사용
2. 없으면 `localizedIdeas` fallback

### Phase 6. Backfill

기존 `localizedIdeas` JSON을 읽어 `GeneratedIdea`로 옮긴다.

백필 대상:

- 최근 1000개 세션
- 저장 가치가 있는 세션 우선

### Phase 7. Cleanup

모든 화면이 새 구조를 쓰면, 그때 `localizedIdeas` 의존도를 줄인다.

바로 삭제하지 말고 최소 1~2 릴리즈는 유지하는 편이 안전하다.

---

## First Implementation Slice

바로 구현할 첫 번째 슬라이스는 이게 좋다.

1. `GeneratedIdea` 추가
2. `IdeaMatchSession`에 `generationVersion` 추가
3. `buildIdeaMatchPrompt`를 한국어 스펙으로 변경
4. 저장 시 `localizedIdeas` + `GeneratedIdea` 동시 저장
5. `Idea Match` 화면을 `generatedIdeas` 우선 사용으로 변경

이렇게 하면:

- DB는 바로 가치가 생기고
- UI도 좋아지고
- 기존 흐름도 안 깨진다

---

## What Not To Do Yet

- 처음부터 모든 시장 데이터를 완전 정규화
- 경쟁사, 규제, 채널, 가격을 각각 별도 테이블로 쪼개기
- 기존 `localizedIdeas`를 즉시 제거
- 프롬프트와 DB와 UI를 한 번에 전면 교체

지금 단계에서는 `저장 구조를 먼저 제품형으로 만드는 것`이 우선이다.

---

## Recommended Next Step

다음 구현 턴에서는 아래 순서로 바로 들어간다.

1. Prisma에 `GeneratedIdea`와 `IdeaMatchSession.generationVersion` 추가
2. `POST /api/idea-match` 저장 로직 이중화
3. 프롬프트를 한국어 V2 스펙으로 변경
4. 프론트 `Idea Match` 결과 렌더링을 `generatedIdeas` 기준으로 교체
