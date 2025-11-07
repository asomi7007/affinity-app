#!/bin/bash

# GitHub Codespaces 환경에서 .env.local 파일을 자동 생성하는 스크립트

FRONTEND_DIR="/workspaces/affinity-app/frontend"
ENV_FILE="$FRONTEND_DIR/.env.local"

if [ -n "$CODESPACES" ] && [ -n "$CODESPACE_NAME" ]; then
  echo "🔧 GitHub Codespaces 환경 감지됨"
  echo "📝 .env.local 파일 생성 중..."
  
  # Codespaces 공개 URL 구성
  BACKEND_URL="https://${CODESPACE_NAME}-8000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}"
  
  # .env.local 파일 생성
  cat > "$ENV_FILE" << EOF
# GitHub Codespaces Development Environment
# 이 파일은 자동으로 생성되었습니다.
# Codespace: $CODESPACE_NAME

# Codespaces 환경에서는 Public URL을 사용해야 WebSocket이 작동합니다
VITE_API_BASE_URL=$BACKEND_URL
EOF
  
  echo "✅ .env.local 파일 생성 완료"
  echo "   Backend URL: $BACKEND_URL"
  echo ""
  echo "⚠️  중요: 프론트엔드를 재시작해야 환경변수가 적용됩니다."
  echo "   실행 명령: cd frontend && npm run dev"
else
  echo "ℹ️  로컬 환경입니다. .env.local 파일이 필요하지 않습니다."
  # 로컬 환경에서는 .env.local 삭제 (있다면)
  if [ -f "$ENV_FILE" ]; then
    rm "$ENV_FILE"
    echo "✅ 기존 .env.local 파일 삭제됨"
  fi
fi
