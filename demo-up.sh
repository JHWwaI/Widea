#!/bin/bash
# Widea 데모 환경 자동 시작 스크립트.
# 백엔드(3001) + ngrok → frontend/.env.local 갱신 → 프론트(3000) + cloudflared.
# 사용: ./demo-up.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="/tmp"
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_BLUE='\033[0;34m'
COLOR_RESET='\033[0m'

echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
echo -e "${COLOR_BLUE}  Widea 데모 환경 부팅${COLOR_RESET}"
echo -e "${COLOR_BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"

# ─── 1. 기존 프로세스 종료 ───
echo -e "${COLOR_YELLOW}[1/6] 기존 프로세스 정리...${COLOR_RESET}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "tsx --env-file" 2>/dev/null || true
pkill -f "ngrok" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 3

# ─── 2. 백엔드 시작 (port 3001) ───
echo -e "${COLOR_YELLOW}[2/6] 백엔드 시작 (3001)...${COLOR_RESET}"
cd "$ROOT"
nohup npm run dev > "$LOG_DIR/widea-backend.log" 2>&1 &
BACKEND_PID=$!
echo "  backend pid=$BACKEND_PID"

# 백엔드 health 대기
echo -n "  대기"
for i in {1..40}; do
  if curl -s -o /dev/null http://localhost:3001/api/health 2>/dev/null; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

# ─── 3. ngrok 시작 + URL 추출 ───
echo -e "${COLOR_YELLOW}[3/6] ngrok 터널 시작 (백엔드 → 공개 URL)...${COLOR_RESET}"
nohup ngrok http 3001 --log=stdout > "$LOG_DIR/widea-ngrok-backend.log" 2>&1 &
NGROK_PID=$!
echo "  ngrok pid=$NGROK_PID"

echo -n "  URL 발급 대기"
NGROK_URL=""
for i in {1..30}; do
  NGROK_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.ngrok-free\.app' | head -1)
  if [ -n "$NGROK_URL" ]; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

if [ -z "$NGROK_URL" ]; then
  echo -e "${COLOR_YELLOW}  ⚠ ngrok URL 못 받음. 로그 확인: tail -20 $LOG_DIR/widea-ngrok-backend.log${COLOR_RESET}"
  exit 1
fi
echo "  → backend URL: $NGROK_URL"

# ─── 4. frontend/.env.local 갱신 ───
echo -e "${COLOR_YELLOW}[4/6] frontend/.env.local 갱신...${COLOR_RESET}"
echo "NEXT_PUBLIC_API_BASE_URL=$NGROK_URL" > "$ROOT/frontend/.env.local"
echo "  ✓"

# ─── 5. 프론트엔드 시작 (port 3000) ───
echo -e "${COLOR_YELLOW}[5/6] 프론트엔드 시작 (3000)...${COLOR_RESET}"
cd "$ROOT/frontend"
nohup npm run dev > "$LOG_DIR/widea-frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  frontend pid=$FRONTEND_PID"

echo -n "  대기"
for i in {1..40}; do
  if curl -s -o /dev/null http://localhost:3000/ 2>/dev/null; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

# ─── 6. cloudflared 시작 + URL 추출 ───
echo -e "${COLOR_YELLOW}[6/6] cloudflared 터널 시작 (프론트 공개 URL)...${COLOR_RESET}"
nohup cloudflared tunnel --url http://localhost:3000 > "$LOG_DIR/widea-cf-frontend.log" 2>&1 &
CF_PID=$!
echo "  cloudflared pid=$CF_PID"

echo -n "  URL 발급 대기"
CF_URL=""
for i in {1..40}; do
  CF_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG_DIR/widea-cf-frontend.log" 2>/dev/null | tail -1)
  if [ -n "$CF_URL" ]; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

if [ -z "$CF_URL" ]; then
  echo -e "${COLOR_YELLOW}  ⚠ cloudflared URL 못 받음. 로그 확인: tail -20 $LOG_DIR/widea-cf-frontend.log${COLOR_RESET}"
fi

# ─── 7. 결과 출력 ───
echo ""
echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
echo -e "${COLOR_GREEN}  ✓ 데모 환경 준비 완료!${COLOR_RESET}"
echo -e "${COLOR_GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${COLOR_RESET}"
echo ""
echo -e "  ${COLOR_BLUE}🌐 친구에게 공유할 URL:${COLOR_RESET}"
echo -e "      ${CF_URL}"
echo ""
echo -e "  ${COLOR_BLUE}📋 로그인:${COLOR_RESET}"
echo -e "      이메일:    dolchi37@gmail.com"
echo -e "      비밀번호:  widea1234"
echo ""
echo -e "  ${COLOR_BLUE}🔧 인프라:${COLOR_RESET}"
echo -e "      backend(ngrok):    $NGROK_URL"
echo -e "      frontend(cf):      $CF_URL"
echo -e "      backend(local):    http://localhost:3001"
echo -e "      frontend(local):   http://localhost:3000"
echo ""
echo -e "  ${COLOR_BLUE}📝 로그 보기:${COLOR_RESET}"
echo -e "      tail -f $LOG_DIR/widea-backend.log"
echo -e "      tail -f $LOG_DIR/widea-frontend.log"
echo -e "      tail -f $LOG_DIR/widea-ngrok-backend.log"
echo -e "      tail -f $LOG_DIR/widea-cf-frontend.log"
echo ""
echo -e "  ${COLOR_BLUE}🛑 모두 종료:${COLOR_RESET}"
echo -e "      ./demo-down.sh"
echo ""
