/**
 * Slack / Discord 웹훅 알림 헬퍼
 * ProjectPolicy에 저장된 URL로 주요 이벤트를 전송한다.
 */

export type WebhookEvent =
  | { type: "idea_selected"; projectTitle: string; ideaTitle: string; ideaId: string }
  | { type: "blueprint_created"; projectTitle: string; companyName: string; feasibilityScore: number }
  | { type: "team_member_invited"; projectTitle: string; email: string; role: string }
  | { type: "team_member_joined"; projectTitle: string; name: string; role: string }
  | { type: "meeting_created"; projectTitle: string; meetingTitle: string; roomUrl: string; scheduledAt?: string };

function buildSlackPayload(event: WebhookEvent): object {
  const emoji: Record<WebhookEvent["type"], string> = {
    idea_selected: "💡",
    blueprint_created: "🗺️",
    team_member_invited: "📩",
    team_member_joined: "👋",
    meeting_created: "📅",
  };
  const title: Record<WebhookEvent["type"], string> = {
    idea_selected: "아이디어 선정",
    blueprint_created: "블루프린트 생성",
    team_member_invited: "팀원 초대",
    team_member_joined: "팀원 합류",
    meeting_created: "회의 개설",
  };

  let text = `${emoji[event.type]} *[${event.projectTitle}] ${title[event.type]}*\n`;

  if (event.type === "idea_selected") {
    text += `선정된 아이디어: ${event.ideaTitle}`;
  } else if (event.type === "blueprint_created") {
    text += `벤치마크: ${event.companyName} | 실현 가능성: ${event.feasibilityScore}/100`;
  } else if (event.type === "team_member_invited") {
    text += `초대 대상: ${event.email} (${event.role})`;
  } else if (event.type === "team_member_joined") {
    text += `합류: ${event.name} (${event.role})`;
  } else if (event.type === "meeting_created") {
    text += `회의: ${event.meetingTitle}\n입장: ${event.roomUrl}`;
    if (event.scheduledAt) text += `\n예정 시간: ${event.scheduledAt}`;
  }

  return { text };
}

function buildDiscordPayload(event: WebhookEvent): object {
  const slack = buildSlackPayload(event) as { text: string };
  return { content: slack.text.replace(/\*/g, "**") };
}

async function sendWebhook(url: string, payload: object): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // 웹훅 실패는 무시 — 알림 실패가 핵심 흐름을 막아서는 안 된다
  }
}

export async function fireWebhooks(
  urls: { slack?: string | null; discord?: string | null },
  event: WebhookEvent,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (urls.slack) tasks.push(sendWebhook(urls.slack, buildSlackPayload(event)));
  if (urls.discord) tasks.push(sendWebhook(urls.discord, buildDiscordPayload(event)));
  await Promise.allSettled(tasks);
}
