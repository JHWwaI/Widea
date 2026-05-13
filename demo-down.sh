#!/bin/bash
# Widea 데모 환경 종료 스크립트.
# 백엔드 / 프론트엔드 / ngrok / cloudflared 모두 정리.

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Widea 데모 환경 종료"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

pkill -f "next dev" 2>/dev/null && echo "  ✓ frontend(next) 종료" || echo "  · frontend 없음"
pkill -f "tsx --env-file" 2>/dev/null && echo "  ✓ backend(tsx) 종료" || echo "  · backend 없음"
pkill -f "ngrok" 2>/dev/null && echo "  ✓ ngrok 종료" || echo "  · ngrok 없음"
pkill -f "cloudflared tunnel" 2>/dev/null && echo "  ✓ cloudflared 종료" || echo "  · cloudflared 없음"

# 포트 점유 잔여 정리 (가끔 next dev 좀비)
lsof -ti :3000 2>/dev/null | xargs -r kill -9 2>/dev/null
lsof -ti :3001 2>/dev/null | xargs -r kill -9 2>/dev/null

echo ""
echo "  ✓ 모든 데모 프로세스 종료됨"
