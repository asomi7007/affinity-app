#!/bin/bash

# Development environment setup script for Codespaces
echo "🚀 Setting up Affinity App development environment..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd backend
pip install --no-cache-dir -r requirements.txt
cd ..

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd frontend
npm ci --prefer-offline
cd ..

# Create environment files from examples
echo "⚙️ Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env 2>/dev/null || echo "# Development environment variables" > backend/.env
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env 2>/dev/null || echo "# Frontend environment variables" > frontend/.env
fi

# Set up pre-commit hooks (optional)
echo "🔧 Setting up development tools..."
pip install --no-cache-dir pre-commit 2>/dev/null || true
pre-commit install 2>/dev/null || true

# Azure CLI 버전 확인
echo "☁️ Checking Azure CLI..."
if command -v az &> /dev/null; then
    AZ_VERSION=$(az version --query '"azure-cli"' -o tsv 2>/dev/null || echo "unknown")
    echo "✅ Azure CLI installed: $AZ_VERSION"
else
    echo "⚠️ Azure CLI not found (will be installed by devcontainer feature)"
fi

# GitHub CLI 버전 확인
echo "🐙 Checking GitHub CLI..."
if command -v gh &> /dev/null; then
    GH_VERSION=$(gh --version | head -1)
    echo "✅ $GH_VERSION"
else
    echo "⚠️ GitHub CLI not found (will be installed by devcontainer feature)"
fi

# 스크립트 실행 권한 설정
echo "🔐 Setting script permissions..."
chmod +x scripts/*.sh 2>/dev/null || true

echo ""
echo "✅ Development environment setup complete!"
echo ""
echo "🌟 Quick start commands:"
echo "  개발 서버:    ./start.sh"
echo "  Backend:      cd backend && uvicorn app.main:app --reload --host 0.0.0.0"
echo "  Frontend:     cd frontend && npm run dev -- --host"
echo "  Tests:        cd backend && pytest"
echo ""
echo "☁️ Azure CI/CD 설정:"
echo "  ./scripts/setup-azure-cicd.sh"
echo ""
