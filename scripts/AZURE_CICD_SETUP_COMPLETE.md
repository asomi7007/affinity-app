# 🎉 Azure CI/CD 자동 설정 완료!

## 📦 생성된 파일들

### 1. **`/scripts/setup-azure-cicd.sh`** ⭐ 메인 스크립트
```bash
# 실행만 하면 끝!
./scripts/setup-azure-cicd.sh
```

**기능:**
- ✅ Azure CLI 설치 확인 및 자동 설치
- ✅ Azure 로그인 (브라우저 인증)
- ✅ 구독 자동/수동 선택
- ✅ GitHub 저장소 정보 자동 감지
- ✅ 리소스 이름 스마트 생성 (기본값 제공)
- ✅ Azure AD App/서비스 주체 생성
- ✅ Federated Credential 설정
- ✅ GitHub Secrets 자동 설정 (GitHub CLI)
- ✅ 설정 정보 `.azure-cicd-config` 파일에 저장

**특징:**
- 🇰🇷 완전 한글 인터페이스
- 🎨 컬러풀한 진행 상황 표시
- 💡 모든 값에 스마트한 기본값 (엔터만 쳐도 OK!)
- 📝 친절한 설명과 안내

### 2. **`/scripts/README_SETUP_AZURE_CICD.md`** 📖 상세 가이드
- 스크립트 실행 예시 (전체 출력)
- 각 단계별 상세 설명
- 문제 해결 가이드
- 팁 및 참고사항

### 3. **`.devcontainer/devcontainer.json`** (업데이트)
```json
{
  "features": {
    "ghcr.io/devcontainers/features/azure-cli:1": {
      "version": "latest",
      "installBicep": true
    },
    "ghcr.io/devcontainers/features/github-cli:1": {
      "version": "latest"
    }
  },
  "extensions": [
    "ms-vscode.azure-account",
    "ms-azuretools.vscode-azurecontainerapps"
  ]
}
```

**Codespaces에 자동 설치:**
- ✅ Azure CLI (최신 버전 + Bicep)
- ✅ GitHub CLI
- ✅ VS Code Azure 확장

### 4. **`.devcontainer/post-create.sh`** (업데이트)
- Azure CLI 버전 확인
- GitHub CLI 버전 확인
- 모든 스크립트 실행 권한 자동 설정
- 안내 메시지에 Azure CI/CD 설정 명령어 추가

### 5. **`.github/workflows/ci-cd.yml`** (업데이트)
- 완전 자동화된 배포 파이프라인
- Container App 없으면 자동 생성
- Health Check 자동 실행
- 배포 URL 자동 출력

### 6. **`.github/SETUP_CICD.md`** 📚 수동 설정 가이드
- 수동 설정 시 참고할 상세 문서
- Azure CLI 명령어 예시
- 문제 해결 팁

### 7. **`README.md`** (업데이트)
- CI/CD 섹션 간소화
- 자동 스크립트 사용 가이드 추가
- 실행 예시 및 특징 설명

## 🚀 사용 방법

### Codespaces에서 (권장)
```bash
# 1. Codespaces 오픈 (Azure CLI/GitHub CLI 자동 설치됨)
# 2. 스크립트 실행
./scripts/setup-azure-cicd.sh

# 3. 대화형으로 설정 진행
#    - 대부분 엔터만 치면 됨 (기본값 사용)
#    - GitHub CLI 로그인되어 있으면 Secrets 자동 설정

# 4. 완료!
```

### 로컬 환경에서
```bash
# Azure CLI 설치 여부 확인
az --version

# 없으면 스크립트가 자동 설치
./scripts/setup-azure-cicd.sh
```

## 📋 생성되는 GitHub Secrets

스크립트 실행 후 자동으로 생성:
1. `AZURE_CLIENT_ID`
2. `AZURE_TENANT_ID`
3. `AZURE_SUBSCRIPTION_ID`
4. `AZURE_RESOURCE_GROUP`
5. `AZURE_CONTAINER_APP_NAME`
6. `AZURE_CONTAINER_APP_ENV`
7. `AZURE_LOCATION`

## 🎯 설정 후 바로 테스트

```bash
# 코드 수정
echo "# CI/CD Test" >> README.md

# 커밋 및 푸시
git add .
git commit -m "test: CI/CD pipeline"
git push origin main

# GitHub Actions 탭에서 확인
# https://github.com/asomi7007/affinity-app/actions
```

## 🌟 완성된 워크플로우

```
코드 수정
  ↓
git push origin main
  ↓
[GitHub Actions 자동 실행]
  ↓
1. ✅ Python 테스트 (pytest)
2. ✅ TypeScript 타입 체크
3. ✅ Frontend 빌드
  ↓
4. ✅ Docker 이미지 빌드
5. ✅ GitHub Container Registry 푸시
  ↓
6. ✅ Azure 로그인 (Federated Credential)
7. ✅ Container App 존재 확인
   - 없으면: 환경 생성 → App 생성
   - 있으면: 이미지 업데이트
  ↓
8. ✅ Health Check (/docs)
9. ✅ 배포 URL 출력
  ↓
🎉 완료!
```

## 💡 핵심 특징

1. **완전 자동화**
   - 한 번 설정하면 끝
   - 코드 푸시만 하면 자동 배포

2. **사용자 친화적**
   - 한글 인터페이스
   - 스마트한 기본값
   - 친절한 안내 메시지

3. **안전성**
   - Federated Credential (비밀번호 불필요)
   - 테스트 실패 시 배포 중단
   - Health Check 자동 실행

4. **무료 사용 가능**
   - GitHub Actions: Public repo 무제한
   - GitHub Container Registry: Public 무제한
   - Azure Container Apps: 월 무료 한도

## 📚 관련 문서

- **메인 README**: [/README.md](/README.md)
- **스크립트 가이드**: [scripts/README_SETUP_AZURE_CICD.md](README_SETUP_AZURE_CICD.md)
- **수동 설정 가이드**: [.github/SETUP_CICD.md](../.github/SETUP_CICD.md)
- **워크플로우**: [.github/workflows/ci-cd.yml](../.github/workflows/ci-cd.yml)

## 🐛 문제 해결

### "Azure CLI not found"
```bash
# Codespaces 재빌드
# Ctrl+Shift+P → "Codespaces: Rebuild Container"
```

### "GitHub CLI not authenticated"
```bash
gh auth login
```

### "Permission denied: setup-azure-cicd.sh"
```bash
chmod +x scripts/setup-azure-cicd.sh
```

## 🎓 다음 단계

1. ✅ CI/CD 설정 완료
2. 📝 코드 수정 및 푸시
3. 👀 GitHub Actions 모니터링
4. 🌐 배포된 앱 접속
5. 🚀 프로덕션 배포!

---

**축하합니다! 이제 완전 자동화된 CI/CD 파이프라인을 갖추었습니다!** 🎉
