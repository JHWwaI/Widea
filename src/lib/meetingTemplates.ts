/**
 * 회의록 템플릿 — 백엔드(Gemini 프롬프트 분기) + 프런트(렌더링) 공유 정의.
 * 키 변경 시 프론트 `frontend/src/lib/meetingTemplates.ts` 도 함께 수정할 것.
 */

export type MeetingTemplateKey =
  | "DEFAULT"
  | "STANDUP"
  | "INVESTOR"
  | "USER_INTERVIEW"
  | "RETRO";

export type MeetingTemplate = {
  key: MeetingTemplateKey;
  label: string;
  description: string;
  /** Gemini 시스템 프롬프트 — JSON 출력 스키마 명시 */
  prompt: string;
};

export const MEETING_TEMPLATES: Record<MeetingTemplateKey, MeetingTemplate> = {
  DEFAULT: {
    key: "DEFAULT",
    label: "팀 정기 회의",
    description: "핵심 요약 · 결정 사항 · 액션 아이템 · 다음 단계",
    prompt: `다음 4개 키만 가진 JSON으로 응답:
{
  "keyPoints": ["..."],
  "decisions": ["..."],
  "actions": [{"owner":"이름 또는 빈 문자열","content":"할 일"}],
  "nextSteps": ["..."]
}

규칙:
- keyPoints: 3~5개, 회의의 핵심 논의 내용 요약
- decisions: 명시적으로 결정된 것만 (결정 안 됐으면 빈 배열)
- actions: owner는 transcript에서 담당자 이름 추출, 없으면 빈 문자열
- nextSteps: 다음 회의까지 해야 할 것 또는 다음 회의 안건`,
  },

  STANDUP: {
    key: "STANDUP",
    label: "데일리 스탠드업",
    description: "어제 한 일 / 오늘 할 일 / 블로커",
    prompt: `데일리 스탠드업 형식. 다음 JSON으로 응답:
{
  "yesterday": [{"owner":"이름","content":"완료한 작업"}],
  "today": [{"owner":"이름","content":"오늘 목표 작업"}],
  "blockers": [{"owner":"이름 또는 빈 문자열","content":"블로커 내용"}]
}

규칙:
- 화자별로 묶어서 한 명당 항목 하나씩 (여러 작업이면 쉼표 구분)
- 블로커 없으면 빈 배열
- 이름이 없으면 owner 빈 문자열`,
  },

  INVESTOR: {
    key: "INVESTOR",
    label: "투자자 · 파트너 미팅",
    description: "Q&A · 우려 사항 · 요청 자료 · 다음 단계",
    prompt: `투자자/파트너 미팅 형식. 다음 JSON으로 응답:
{
  "qa": [{"question":"상대방 질문","answer":"우리 측 답변"}],
  "concerns": ["상대방이 명시한 우려 또는 의문"],
  "followUps": ["상대방이 요청한 자료·정보·액션"],
  "nextSteps": ["다음 단계 (미팅 일정·DD·계약 등)"]
}

규칙:
- qa: 질문-답변 쌍으로 구성. 답이 없었으면 answer 빈 문자열
- concerns: 투자자/파트너가 직접 언급한 것만
- followUps: 구체적인 요청 사항 위주`,
  },

  USER_INTERVIEW: {
    key: "USER_INTERVIEW",
    label: "고객 · 유저 인터뷰",
    description: "페인포인트 · 인사이트 · 가설 검증 · 직접 인용",
    prompt: `사용자 인터뷰 형식. 다음 JSON으로 응답:
{
  "painPoints": ["사용자가 표현한 불편·문제 (명사구로 정리)"],
  "insights": ["우리 팀에 새로운 인사이트 또는 발견"],
  "hypothesesValidated": ["사실로 확인된 가설"],
  "hypothesesRejected": ["틀렸다고 확인된 가설"],
  "openQuestions": ["추가 검증·조사가 필요한 질문"],
  "quotes": ["의사결정에 활용할 직접 인용 1~3개 (의역 금지)"]
}

규칙:
- painPoints는 사용자 말을 그대로 옮기지 않고 명사구로 재정리
- quotes만 transcript 그대로 인용 (쌍따옴표 포함)
- hypotheses 검증 여부가 불분명하면 openQuestions에 넣기`,
  },

  RETRO: {
    key: "RETRO",
    label: "스프린트 회고 (KPT)",
    description: "Keep — 유지 · Problem — 문제 · Try — 시도",
    prompt: `스프린트 회고(KPT) 형식. 다음 JSON으로 응답:
{
  "keep": ["잘 됐고 계속 유지해야 할 것"],
  "problem": ["문제가 됐거나 개선이 필요한 것"],
  "try": ["다음 스프린트에서 시도해볼 것"]
}

규칙:
- 각 항목 한 줄, 짧고 구체적으로
- 막연한 표현 지양 ("소통 개선" → "스탠드업 시 블로커 먼저 공유")
- try는 반드시 problem에서 파생된 개선안 포함`,
  },
};

export function isMeetingTemplateKey(v: unknown): v is MeetingTemplateKey {
  return typeof v === "string" && v in MEETING_TEMPLATES;
}
