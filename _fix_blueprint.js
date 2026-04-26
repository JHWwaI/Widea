const fs = require('fs');
let content = fs.readFileSync('src/server.ts', 'utf8');

// Find blueprint route boundaries
const bpStart = content.indexOf('app.post("/api/blueprint"');
// Find the closing of the blueprint route handler - it ends with `});` after `res.status(500).json`
const errorLine = content.indexOf('res.status(500).json({ error: msg });', bpStart);
const bpEnd = content.indexOf('});', errorLine) + 3;

const beforeBp = content.substring(0, bpStart);
const afterBp = content.substring(bpEnd);

const newBlueprint = `app.post("/api/blueprint", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = getAuthedUser(req);
    const {
      globalCaseId,
      projectPolicyId,
      budget = 20_000_000,
      targetMarket = "B2C",
    } = req.body;
    const blueprintCost = CREDIT_COSTS["blueprint"];
    const VALID_MARKETS: TargetMarket[] = ["B2B", "B2C", "B2B2C"];

    // -- input validation --
    if (!globalCaseId || typeof globalCaseId !== "string") {
      res.status(400).json({ errorCode: "MISSING_GLOBAL_CASE_ID", error: "globalCaseId(string)는 필수입니다." });
      return;
    }
    if (!projectPolicyId || typeof projectPolicyId !== "string") {
      res.status(400).json({
        errorCode: "MISSING_PROJECT_ID",
        error: "projectPolicyId(string)는 필수입니다.",
        hint: "POST /api/projects 로 프로젝트를 먼저 생성하세요.",
      });
      return;
    }
    if (budget !== undefined && budget !== null) {
      const b = Number(budget);
      if (isNaN(b) || b < 0) {
        res.status(400).json({ errorCode: "INVALID_BUDGET", error: "예산은 0 이상의 숫자여야 합니다." });
        return;
      }
    }
    if (targetMarket && !VALID_MARKETS.includes(targetMarket)) {
      res.status(400).json({ errorCode: "INVALID_TARGET_MARKET", error: "유효한 타깃 마켓이 아닙니다: B2B, B2C, B2B2C" });
      return;
    }

    // 1) 글로벌 사례 조회
    const caseMeta = await prisma.globalCaseMeta.findUnique({
      where: { id: globalCaseId },
    });
    if (!caseMeta) {
      res.status(404).json({ errorCode: "CASE_NOT_FOUND", error: "해당 글로벌 사례를 찾을 수 없습니다." });
      return;
    }

    // 2) 프로젝트 정책 조회 (소유권 검증 포함)
    const policy = await prisma.projectPolicy.findFirst({
      where: { id: projectPolicyId, userId },
    });
    if (!policy) {
      res.status(404).json({ errorCode: "PROJECT_NOT_FOUND", error: "프로젝트를 찾을 수 없습니다." });
      return;
    }

    const currentBalance = await getCreditBalance(prisma, userId);
    if (currentBalance === null || currentBalance < blueprintCost) {
      respondInsufficientCredits(res, {
        feature: "Blueprint",
        required: blueprintCost,
        creditBalance: currentBalance,
      });
      return;
    }

    console.log(\`\\n📝 Blueprint 요청: \${caseMeta.companyName} → 한국형 전략\`);

    // 3) Groq 프롬프트 구성
    const budgetWon = Math.round(budget / 10000);
    const prompt = buildBlueprintPrompt(caseMeta, policy, budgetWon, targetMarket);

    console.log(\`   [1/2] Groq 전략 생성 중..\`);
    const result = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 4096,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = (result.choices[0].message.content ?? "").replace(/^` + '```' + `[a-z]*\\n?/i, "").replace(/` + '```' + `$/,"").trim();
    const analysis = JSON.parse(raw);
    console.log(\`   [1/2] 전략 생성 완료 (실현가능성: \${analysis.feasibilityScore ?? "?"})\`);

    // 4) KBlueprint DB 저장 + 크레딧 차감
    console.log(\`   [2/2] DB 저장 중..\`);
    const persisted = await prisma.$transaction(async (tx) => {
      const creditResult = await consumeCredits(tx, userId, blueprintCost, "blueprint");
      if (!creditResult) return null;

      const blueprint = await tx.kBlueprint.create({
        data: {
          feasibilityScore: clamp(analysis.feasibilityScore ?? 50, 0, 100),
          regulations: analysis.regulations ?? null,
          localization: analysis.localization ?? null,
          altDesign: analysis.altDesign ?? null,
          projectPolicyId,
          globalCaseMetaId: globalCaseId,
        },
      });

      return { blueprint, balanceAfter: creditResult.balanceAfter };
    });

    if (!persisted) {
      respondCreditConflict(res, {
        feature: "Blueprint",
        required: blueprintCost,
      });
      return;
    }

    console.log(\`   [2/2] ✅ 완료 (blueprintId: \${persisted.blueprint.id}, 실현가능성: \${persisted.blueprint.feasibilityScore})\`);

    res.json({
      blueprintId: persisted.blueprint.id,
      feasibilityScore: persisted.blueprint.feasibilityScore,
      benchmarkCase: {
        companyName: caseMeta.companyName,
        industry: caseMeta.industry,
        revenueModel: caseMeta.revenueModel,
      },
      creditUsed: blueprintCost,
      creditBalance: persisted.balanceAfter,
      analysis,
    });
  } catch (err) {
    handleRouteError(res, err, "Blueprint 오류");
  }
});`;

fs.writeFileSync('src/server.ts', beforeBp + newBlueprint + afterBp, 'utf8');
console.log('Blueprint route updated successfully');
