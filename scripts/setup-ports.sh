#!/bin/bash

# GitHub Codespaces 포트 가시성 설정 스크립트
# 포트 8000을 Public으로 설정합니다.

echo "🔍 GitHub Codespaces 환경 확인 중..."

# Codespaces 환경 감지
if [ -n "$CODESPACES" ]; then
  echo "✅ GitHub Codespaces 환경 감지됨"
  echo ""
  echo "📡 포트 8000을 Public으로 설정 중..."
  
  # gh CLI를 사용하여 포트 가시성 설정 (가능한 경우)
  if command -v gh &> /dev/null; then
    gh codespace ports visibility 8000:public -c $CODESPACE_NAME 2>/dev/null || true
    gh codespace ports visibility 5173:public -c $CODESPACE_NAME 2>/dev/null || true
    echo "✅ 포트 가시성 설정 완료"
  else
    echo "⚠️  gh CLI를 찾을 수 없습니다."
  fi
  
  echo ""
  echo "📋 수동 확인 방법:"
  echo "   1. VS Code 하단의 'PORTS' 탭 클릭"
  echo "   2. 포트 8000 찾기"
  echo "   3. 'Visibility' 열에서 'Public'인지 확인"
  echo "   4. Private이면 우클릭 → 'Port Visibility' → 'Public' 선택"
  echo ""
else
  echo "ℹ️  로컬 개발 환경입니다. 포트 설정이 필요하지 않습니다."
fi

echo "✨ 완료!"
