import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * 100개 벤치마크 시드의 URL·기업 존재 여부 검증 + 어노테이션.
 *
 * Input:  src/data/benchmarks/seed.jsonl (한 줄 한 JSON, T1~T8 출력 합친 것)
 *         또는 단일 JSON 배열 src/data/benchmarks/seed.json
 *
 * Output: src/data/benchmarks/seed.verified.jsonl
 *         각 엔트리에 `_verification` 필드 추가:
 *           {
 *             archive_link:   { ok: bool, status: number },
 *             crunchbase:     { ok: bool, status: number },
 *             social_proof:   { ok: bool, status: number },
 *             company_exists: bool   // Wikidata 회사명 검색 결과
 *           }
 *
 * 사용:
 *   pnpm tsx scripts/verify_benchmark_urls.ts
 *   pnpm tsx scripts/verify_benchmark_urls.ts --input src/data/benchmarks/seed.json
 *   pnpm tsx scripts/verify_benchmark_urls.ts --concurrency 8
 */

type BenchmarkEntry = {
  metadata: { category: string; sub_category: string };
  company_profile: { name: string; founded_year: number };
  reliability_evidence: {
    crunchbase?: string;
    archive_link?: string;
    social_proof?: string;
  };
  _verification?: VerificationResult;
};

type UrlCheck = { ok: boolean; status: number; finalUrl?: string };

type VerificationResult = {
  archive_link: UrlCheck | null;
  crunchbase: UrlCheck | null;
  social_proof: UrlCheck | null;
  company_exists: boolean;
};

const TIMEOUT_MS = 10_000;
const DEFAULT_CONCURRENCY = 6;

function parseArgs(): { input: string; output: string; concurrency: number } {
  const argv = process.argv.slice(2);
  let input = "src/data/benchmarks/seed.jsonl";
  let output = "src/data/benchmarks/seed.verified.jsonl";
  let concurrency = DEFAULT_CONCURRENCY;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") input = argv[++i];
    else if (a === "--output") output = argv[++i];
    else if (a === "--concurrency") concurrency = parseInt(argv[++i], 10);
  }
  return { input, output, concurrency };
}

async function loadEntries(absPath: string): Promise<BenchmarkEntry[]> {
  const buf = await fs.readFile(absPath, "utf8");
  const trimmed = buf.trim();

  // JSON 배열로 저장된 경우
  if (trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as BenchmarkEntry[];
  }

  // JSONL: 한 줄 한 객체
  return trimmed
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as BenchmarkEntry);
}

async function checkUrl(url: string | undefined): Promise<UrlCheck | null> {
  if (!url || typeof url !== "string") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // 일부 서버가 HEAD를 거부하므로 GET + Range 헤더로 첫 바이트만 받기
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WideaBenchmarkVerifier/1.0; +https://widea.app)",
        Range: "bytes=0-0",
        Accept: "text/html,application/json,*/*",
      },
    });
    return {
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      finalUrl: res.url,
    };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function checkCompanyExists(name: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const apiUrl = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
      name,
    )}&language=en&format=json&type=item&limit=1`;
    const res = await fetch(apiUrl, { signal: controller.signal });
    if (!res.ok) return false;
    const body = (await res.json()) as { search?: unknown[] };
    return Array.isArray(body.search) && body.search.length > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function verifyEntry(entry: BenchmarkEntry): Promise<BenchmarkEntry> {
  const ev = entry.reliability_evidence ?? {};
  const [archive, cb, social, exists] = await Promise.all([
    checkUrl(ev.archive_link),
    checkUrl(ev.crunchbase),
    checkUrl(ev.social_proof),
    checkCompanyExists(entry.company_profile.name),
  ]);
  return {
    ...entry,
    _verification: {
      archive_link: archive,
      crunchbase: cb,
      social_proof: social,
      company_exists: exists,
    },
  };
}

async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main() {
  const { input, output, concurrency } = parseArgs();
  const repoRoot = path.resolve(__dirname, "..");
  const inputAbs = path.resolve(repoRoot, input);
  const outputAbs = path.resolve(repoRoot, output);

  console.log(`[load] ${inputAbs}`);
  const entries = await loadEntries(inputAbs);
  console.log(`[load] ${entries.length} entries`);

  const startedAt = Date.now();
  let done = 0;

  const verified = await runWithConcurrency(
    entries,
    async (entry) => {
      const result = await verifyEntry(entry);
      done++;
      if (done % 10 === 0 || done === entries.length) {
        console.log(`  ${done}/${entries.length} verified`);
      }
      return result;
    },
    concurrency,
  );

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`[verify] done in ${elapsed}s`);

  const lines = verified.map((e) => JSON.stringify(e)).join("\n");
  await fs.writeFile(outputAbs, lines + "\n", "utf8");
  console.log(`[write] ${outputAbs}`);

  // 요약 리포트
  let archiveOk = 0,
    cbOk = 0,
    socialOk = 0,
    companyOk = 0;
  const broken: string[] = [];
  for (const e of verified) {
    const v = e._verification!;
    if (v.archive_link?.ok) archiveOk++;
    if (v.crunchbase?.ok) cbOk++;
    if (v.social_proof?.ok) socialOk++;
    if (v.company_exists) companyOk++;
    if (!v.archive_link?.ok || !v.crunchbase?.ok || !v.company_exists) {
      broken.push(
        `  ${e.company_profile.name}: archive=${v.archive_link?.status ?? "-"} cb=${v.crunchbase?.status ?? "-"} wikidata=${v.company_exists}`,
      );
    }
  }

  const n = verified.length;
  console.log(`\n=== Summary ===`);
  console.log(`  archive_link OK : ${archiveOk}/${n}`);
  console.log(`  crunchbase   OK : ${cbOk}/${n}`);
  console.log(`  social_proof OK : ${socialOk}/${n}`);
  console.log(`  Wikidata 매칭  : ${companyOk}/${n}`);

  if (broken.length > 0) {
    console.log(`\n=== Needs review (${broken.length}) ===`);
    console.log(broken.join("\n"));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
