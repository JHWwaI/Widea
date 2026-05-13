/**
 * 워크스페이스 6단계의 목표·결과물·예상 기간 (v1).
 */

export type StageGoal = {
  goal: string;
  outcome: string;
  duration: string;
  firstAction: string;
  pitfall?: string;
};

export const STAGE_GOALS: Record<number, StageGoal> = {
  1: {
    goal: "법적·세무적으로 사업을 시작할 수 있는 상태",
    outcome: "사업자등록증 + 사업 통장 + 1장 사업계획서",
    duration: "1~2일",
    firstAction: "사업자등록",
    pitfall: "처음엔 개인사업자가 빠름. 법인 전환은 매출 5천~1억 이후.",
  },
  2: {
    goal: "혼자가 아닌 핵심 팀(또는 외주 파트너) 확보",
    outcome: "공동창업자/핵심 외주 1~2명 + 역할·지분 합의",
    duration: "1~3주",
    firstAction: "공동창업자 결정",
    pitfall: "혼자 시작해도 OK. 핵심은 '내가 못하는 일'을 누가 할지.",
  },
  3: {
    goal: "MVP 정의 — 만들 것을 종이에 그리기",
    outcome: "타겟 페르소나 + MVP 기능 3개 + 와이어프레임",
    duration: "3~7일",
    firstAction: "타겟 페르소나 정의",
    pitfall: "기능을 5개 이상 넣지 말 것. 첫 사용자 1명을 만족시킬 3개만.",
  },
  4: {
    goal: "MVP를 실제로 동작하는 형태로 빌드",
    outcome: "도메인에 접속 가능한 베타 버전",
    duration: "2~6주",
    firstAction: "프론트엔드 빌드",
    pitfall: "결제·알림 다 넣지 말 것. 핵심 기능 1개부터 동작.",
  },
  5: {
    goal: "5~10명에게 실제로 써보게 하고 피드백 수집",
    outcome: "베타 사용자 5~10명 + 분석 도구 + 핵심 KPI",
    duration: "1~2주",
    firstAction: "도메인 + HTTPS",
    pitfall: "친구·가족이 아닌 '돈 낼 가능성 있는' 사람을 베타로.",
  },
  6: {
    goal: "유료 사용자 첫 100명 돌파",
    outcome: "랜딩페이지 + 주력 채널 1개 + 유료 사용자 100명",
    duration: "1~3개월",
    firstAction: "랜딩페이지 제작",
    pitfall: "한 채널에서 '되는 것'이 보일 때까지 다른 채널 분산하지 말 것.",
  },
};
