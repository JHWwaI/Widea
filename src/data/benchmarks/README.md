# 벤치마크 시드 데이터

WIDEA 벤치마크 마스터 스키마 v2.0으로 생성한 글로벌 스타트업 RAG 시드.
스키마 정의: `docs/benchmark-data-generation-prompt-v2.md`

## 파일

- `seed.jsonl` — 한 줄 한 JSON 객체. 사람이 추가/수정 가능.
- `seed.verified.jsonl` — `pnpm verify_benchmarks` 실행 결과. 각 엔트리에 `_verification` 어노테이션 포함. **수동 편집 금지** (재생성됨).

## 채우는 법

1차 100개 (T1~T8)는 채팅 히스토리에 JSON 배열 형태로 있음. 다음 절차로 통합:

```bash
# 옵션 A. 각 턴의 JSON 배열을 합쳐 단일 JSON 배열로 저장
#   (T1.json ... T8.json 으로 저장 후)
jq -s 'add' src/data/benchmarks/T*.json > src/data/benchmarks/seed.json

# 옵션 B. JSONL로 변환 (한 줄 한 객체)
jq -c '.[]' src/data/benchmarks/seed.json > src/data/benchmarks/seed.jsonl
```

또는 `seed.jsonl`에 직접 한 줄에 한 JSON씩 붙여넣어도 됨.

## 검증

```bash
pnpm verify_benchmarks
# 또는 입력 경로 지정
pnpm verify_benchmarks --input src/data/benchmarks/seed.json --concurrency 8
```

검증 항목:
- `archive_link` (Wayback Machine) HEAD 도달 가능 여부
- `crunchbase` URL 도달
- `social_proof` URL 도달
- 회사명이 Wikidata에 존재하는지 (회사 자체의 실재 여부)

결과는 `seed.verified.jsonl`로 저장되고, 콘솔에 요약 + 검토 필요 리스트가 출력됨.

## Pinecone 인덱싱

`similarity_vector_seed` 필드만 임베딩해 RAG에 적재.
기존 `scripts/sync_pinecone.ts` 패턴을 따라 추가 스크립트 작성 권장.
