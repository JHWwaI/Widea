/**
 * 현재 Claude Code 대화 transcript에서 ```json ... ``` 블록을 추출해
 * 벤치마크 시드 형식만 골라 src/data/benchmarks/seed.jsonl에 적재.
 *
 * 사용:
 *   npx tsx scripts/extract_benchmarks_from_chat.ts <transcript.jsonl>
 */

import fs from "node:fs";
import path from "node:path";

type ContentBlock = { type: string; text?: string };
type Message = {
  type?: string;
  message?: { role?: string; content?: ContentBlock[] | string };
};

function extractJsonBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /```json\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function isBenchmarkEntry(obj: unknown): boolean {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    "metadata" in o &&
    "company_profile" in o &&
    "product_logic" in o &&
    "reliability_evidence" in o
  );
}

function main() {
  const transcriptPath = process.argv[2];
  if (!transcriptPath) {
    console.error("Usage: tsx scripts/extract_benchmarks_from_chat.ts <transcript.jsonl>");
    process.exit(1);
  }

  const lines = fs.readFileSync(transcriptPath, "utf8").split("\n");
  const entries: unknown[] = [];
  let blocksScanned = 0;
  let blocksParsed = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let msg: Message;
    try {
      msg = JSON.parse(trimmed) as Message;
    } catch {
      continue;
    }

    const role = msg.message?.role;
    if (role !== "assistant") continue;

    const content = msg.message?.content;
    let text = "";
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      for (const block of content) {
        if (block.type === "text" && typeof block.text === "string") {
          text += block.text + "\n";
        }
      }
    }
    if (!text) continue;

    const blocks = extractJsonBlocks(text);
    blocksScanned += blocks.length;

    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block);
        blocksParsed++;
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (isBenchmarkEntry(item)) entries.push(item);
          }
        } else if (isBenchmarkEntry(parsed)) {
          entries.push(parsed);
        }
      } catch {
        // 파싱 실패 블록은 무시
      }
    }
  }

  // 회사명으로 dedupe (가장 마지막 entry 우선)
  const byName = new Map<string, unknown>();
  for (const e of entries) {
    const name = (e as { company_profile?: { name?: string } }).company_profile?.name;
    if (name) byName.set(name, e);
  }
  const unique = Array.from(byName.values());

  const repoRoot = path.resolve(__dirname, "..");
  const outputPath = path.resolve(repoRoot, "src/data/benchmarks/seed.jsonl");
  const jsonl = unique.map((e) => JSON.stringify(e)).join("\n") + "\n";
  fs.writeFileSync(outputPath, jsonl, "utf8");

  console.log(`scanned blocks: ${blocksScanned}`);
  console.log(`parsed blocks : ${blocksParsed}`);
  console.log(`benchmark entries: ${entries.length}`);
  console.log(`unique by company name: ${unique.length}`);
  console.log(`written: ${outputPath}`);
}

main();
