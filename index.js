#!/usr/bin/env node
// 운영 부트스트랩: prisma migrate deploy → 컴파일된 서버 시작
// Render·Heroku 등이 기본으로 `node index.js` 또는 `node <main>`을 호출해도 동작하도록 보장.
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");

function run(cmd, args) {
  console.log(`[boot] ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (result.status !== 0) {
    console.error(`[boot] '${cmd}' exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

// 운영 환경에서만 마이그레이션 실행
if (process.env.NODE_ENV === "production") {
  run("npx", ["prisma", "migrate", "deploy"]);
}

// 컴파일된 서버 진입
require(path.join(__dirname, "dist", "server.js"));
