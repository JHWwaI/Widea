# WIDEA 벤치마크 마스터 스키마 v2.0 — 데이터 생성 프롬프트

RAG용 글로벌 스타트업 벤치마크 데이터를 LLM으로 생성할 때 사용하는 표준 프롬프트.
한 번에 10개씩 끊어서 생성한다.

---

## Role

너는 스타트업 분석가이자 비즈니스 고고학자, 그리고 데이터 엔지니어이다.
제공된 기업 리스트에 대해 'WIDEA 벤치마크 마스터 스키마 v2.0' 규격에 맞는
고품질 JSON 데이터를 생성하라.

## Task

아래 [Target Companies] 리스트의 각 기업에 대해 TechCrunch, Crunchbase, 공식 블로그,
그리고 반드시 'Wayback Machine(archive.org)'의 설립 초창기 데이터를 분석하여
정교한 JSON을 작성하라.

## Data Generation Principles (Strict)

1. **Evidence-Based**: `archive_link`는 반드시 해당 기업의 설립 연도(Founded Year) 직후의 유효한 Wayback Machine URL이어야 한다.
2. **The MVP Mirror**: 현재의 거대한 모습이 아닌, 런칭 당시 딱 3개뿐이었던 핵심 기능(MVP)을 찾아내어 기록하라.
3. **Pivot Archaeology**: 창업자 인터뷰와 뉴스 아카이브를 대조하여, 그들이 처음에 실패했던 가설과 방향을 튼 결정적 계기(Pivot Moment)를 추출하라.
4. **No Hallucination**: 수치가 불분명할 경우 해당 산업군 평균을 기반으로 "추정(Estimated)"임을 명시하여 기입하라.

## JSON Schema (v2.0)

```json
{
  "metadata": {
    "category": "카테고리",
    "sub_category": "세부 도메인",
    "industry_keywords": ["키워드1", "키워드2"],
    "similarity_vector_seed": "유사도 매칭용 핵심 요약 문장 (최소 2문장 이상 상세히)"
  },
  "company_profile": {
    "name": "기업명",
    "founded_year": 0,
    "location": "도시, 국가",
    "status": {
      "stage": "투자단계",
      "valuation_usd": 0,
      "total_funding_usd": 0,
      "last_updated": "YYYY-MM-DD"
    }
  },
  "product_logic": {
    "core_value_prop": "가치 제안",
    "pain_point_mapping": "해결한 진짜 문제(Problem)",
    "mvp_scope": {
      "features": ["기능1", "기능2", "기능3"],
      "development_complexity": "상/중/하"
    },
    "tech_stack_hint": ["기술1", "기술2"],
    "pivot_moment": "초기 실패 가설과 방향 전환의 결정적 계기"
  },
  "market_entry": {
    "beachhead_market": "초기 타겟 시장 (송곳 시장)",
    "initial_user_acquisition": {
      "channel": "유입 채널",
      "method": "첫 100명을 모은 구체적 방법"
    }
  },
  "reliability_evidence": {
    "crunchbase": "URL",
    "archive_link": "Wayback Machine 초기 아카이브 URL",
    "social_proof": "Product Hunt 또는 초기 뉴스 링크"
  }
}
```

## [Target Companies]

(이곳에 카테고리별 기업 리스트 10개를 붙여넣으세요)

## 지시사항

위 리스트의 기업들에 대해 JSON 코드를 생성해줘.
한 번에 10개씩 끊어서 생성하고, 완료되면 다음 10개를 요청한다.

---

## 운영 노트

- 생성된 JSON은 `src/data/benchmarks/` 또는 RAG 인덱스에 적재한다.
- `last_updated`는 생성 시점의 날짜로 채운다.
- 추정값은 `valuation_usd: 0` 등 0/null 대신 별도 필드로 `"estimated": true`를 함께 두는 것을 권장.
- 동일 기업을 재생성할 때는 `archive_link`가 유효한지 반드시 검증.
