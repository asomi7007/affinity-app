# Azure CI/CD 자동 설정 가이드

## 🎯 한 줄 요약
```bash
./scripts/setup-azure-cicd.sh
```
위 명령어 하나로 GitHub Actions → Azure Container Apps 자동 배포 완성!

## ✨ 특징

### 완전 자동화
- ✅ Azure CLI 설치 여부 자동 확인 및 설치
- ✅ Azure 로그인 (브라우저 인증)
- ✅ 구독 자동 선택 (1개면 자동, 여러개면 선택)
- ✅ GitHub 저장소 정보 자동 감지
- ✅ 리소스 이름 스마트 생성
- ✅ Azure AD 앱/서비스 주체 자동 생성
- ✅ GitHub Secrets 자동 설정 (GitHub CLI 사용)

### 사용자 친화적
- 🇰🇷 **한글 인터페이스**
- 💡 모든 값에 **기본값 제공** (엔터만 치면 OK)
- 🎨 **컬러풀한 출력**으로 진행 상황 명확히 표시
- 📝 설정 값을 `.azure-cicd-config` 파일에 자동 저장
- ⚠️ 오류 시 **친절한 안내 메시지**

## 🚀 실행 방법

### Codespaces 환경 (권장)
```bash
# Codespaces에는 Azure CLI가 자동 설치됨
./scripts/setup-azure-cicd.sh
```

### 로컬 환경
```bash
# Azure CLI 없으면 자동 설치
./scripts/setup-azure-cicd.sh
```

## 📖 실행 예시

```bash
$ ./scripts/setup-azure-cicd.sh

    ╔═══════════════════════════════════════════════════════════╗
    ║        Azure CI/CD 자동 설정 스크립트                     ║
    ╚═══════════════════════════════════════════════════════════╝

ℹ️ 이 스크립트는 GitHub Actions를 통한 Azure Container Apps 자동 배포를 설정합니다.

설정을 시작하시겠습니까? [Y/n]: 

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Azure CLI 확인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Azure CLI가 이미 설치되어 있습니다 (버전: 2.65.0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 Azure 로그인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ 브라우저가 열립니다. Azure 계정으로 로그인해주세요.

✅ Azure 로그인 성공!

ℹ️ 사용 가능한 구독 목록:
Name               CloudName    SubscriptionId                        State    IsDefault
-----------------  -----------  ------------------------------------  -------  -----------
My Subscription    AzureCloud   abc12345-6789-0123-4567-890abcdef123  Enabled  True

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Azure 구독 선택
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 구독이 1개만 있어서 자동으로 선택됩니다: My Subscription

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ GitHub 저장소 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ GitHub 저장소 자동 감지: asomi7007/affinity-app

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Azure 리소스 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

프로젝트 이름 (영문, 숫자, 하이픈만 가능) [기본값: affinity-app]: 
리소스 그룹 이름 [기본값: affinity-app-rg-20251107-a1b2]: 

ℹ️ 주요 Azure 지역:
  1. koreacentral (한국 중부)
  2. koreasouth (한국 남부)
  3. japaneast (일본 동부)
  4. southeastasia (동남아시아)
  5. eastus (미국 동부)

Azure 지역 [기본값: koreacentral]: 
Container App 이름 [기본값: affinity-app]: 
Container Apps 환경 이름 [기본값: affinity-app-env]: 
Docker 이미지 [기본값: ghcr.io/asomi7007/affinity-app:latest]: 

✅ 리소스 설정 완료!

설정 요약:
  프로젝트: affinity-app
  리소스 그룹: affinity-app-rg-20251107-a1b2
  지역: koreacentral
  Container App: affinity-app
  환경: affinity-app-env
  이미지: ghcr.io/asomi7007/affinity-app:latest

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 리소스 그룹 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ 리소스 그룹 생성 중: affinity-app-rg-20251107-a1b2
✅ 리소스 그룹 생성 완료: affinity-app-rg-20251107-a1b2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 서비스 주체 생성
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ℹ️ Azure AD App 생성 중: affinity-app-deployer
✅ Azure AD App 생성 완료: 12345678-abcd-1234-5678-90abcdef1234
✅ 서비스 주체 생성 완료
✅ Contributor 역할 부여 완료
✅ Federated Credential 생성 완료

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 GitHub Secrets 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
다음 값들을 GitHub Secrets에 저장하세요!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

┌────────────────────────────────────────────────────────────────┐
│ Secret Name                │ Value                             │
├────────────────────────────────────────────────────────────────┤
│ AZURE_CLIENT_ID            │ 12345678-abcd-1234-5678-90abcdef...│
│ AZURE_TENANT_ID            │ 87654321-dcba-4321-8765-fedcba...  │
│ AZURE_SUBSCRIPTION_ID      │ abc12345-6789-0123-4567-890abc...  │
│ AZURE_RESOURCE_GROUP       │ affinity-app-rg-20251107-a1b2      │
│ AZURE_CONTAINER_APP_NAME   │ affinity-app                       │
│ AZURE_CONTAINER_APP_ENV    │ affinity-app-env                   │
│ AZURE_LOCATION             │ koreacentral                       │
└────────────────────────────────────────────────────────────────┘

✅ 설정 정보가 .azure-cicd-config 파일에 저장되었습니다.

GitHub CLI를 사용하여 자동으로 Secrets를 설정하시겠습니까? [Y/n]: y

ℹ️ GitHub Secrets 자동 설정 중...
✅ Set Actions secret AZURE_CLIENT_ID for asomi7007/affinity-app
✅ Set Actions secret AZURE_TENANT_ID for asomi7007/affinity-app
✅ Set Actions secret AZURE_SUBSCRIPTION_ID for asomi7007/affinity-app
✅ Set Actions secret AZURE_RESOURCE_GROUP for asomi7007/affinity-app
✅ Set Actions secret AZURE_CONTAINER_APP_NAME for asomi7007/affinity-app
✅ Set Actions secret AZURE_CONTAINER_APP_ENV for asomi7007/affinity-app
✅ Set Actions secret AZURE_LOCATION for asomi7007/affinity-app
✅ GitHub Secrets 자동 설정 완료!

ℹ️ 확인: https://github.com/asomi7007/affinity-app/settings/secrets/actions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 설정 완료!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

축하합니다! CI/CD 파이프라인 설정이 완료되었습니다!

다음 단계:

  1. GitHub Secrets 확인
     https://github.com/asomi7007/affinity-app/settings/secrets/actions

  2. 코드를 수정하고 푸시하기
     git add .
     git commit -m "test: CI/CD pipeline test"
     git push origin main

  3. GitHub Actions 확인
     https://github.com/asomi7007/affinity-app/actions

  4. 배포된 앱 확인 (배포 완료 후)
     Actions 탭의 워크플로우 Summary에서 URL 확인

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 모든 설정이 완료되었습니다! 🎉
```

## 🎓 스크립트 기능 상세

### 1. Azure CLI 설치 확인
- 이미 설치됨: 버전 표시하고 다음 단계로
- 설치 안됨: 자동 설치 제안 → OS 자동 감지 → 적절한 방법으로 설치

### 2. Azure 로그인
- 이미 로그인됨: 현재 계정 표시 → 다른 계정으로 로그인 여부 확인
- 로그인 안됨: 브라우저 열어서 인증

### 3. 구독 선택
- 구독 1개: 자동 선택
- 구독 여러개: 표로 보여주고 선택

### 4. GitHub 저장소 정보
- GitHub CLI로 자동 감지
- Git remote에서 추출
- 수동 입력 (위 방법 실패 시)

### 5. 리소스 설정
- 프로젝트 이름: 기본값 `affinity-app`
- 리소스 그룹: 자동 생성 (날짜+랜덤 포함)
- 지역: 주요 지역 목록 표시
- 모든 값에 스마트한 기본값 제공

### 6. 리소스 생성
- 리소스 그룹 존재 여부 확인
- 이미 존재: 사용 여부 확인
- 없음: 자동 생성

### 7. 서비스 주체 생성
- Azure AD App 생성
- Service Principal 생성
- Contributor 역할 부여 (재시도 로직 포함)
- Federated Credential 생성 (비밀번호 불필요!)

### 8. GitHub Secrets 설정
- 표 형식으로 값 표시
- `.azure-cicd-config` 파일에 저장
- GitHub CLI 사용 가능 시: 자동 설정 제안
- 수동 설정 시: 복사하기 쉽게 표시

## 🛠️ 문제 해결

### Azure CLI 설치 실패
```bash
# 수동 설치 (Ubuntu/Debian)
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# 수동 설치 (macOS)
brew install azure-cli
```

### GitHub CLI 없음 (Secrets 자동 설정 불가)
```bash
# GitHub CLI 설치
# Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh

# macOS
brew install gh

# 로그인
gh auth login
```

### 권한 부족 오류
```bash
# Service Principal에 적절한 역할이 부여되었는지 확인
az role assignment list --assignee <APP_ID> --all
```

### Federated Credential 생성 실패
- GitHub 저장소 경로 확인 (`OWNER/REPO` 형식)
- 브랜치 이름 확인 (main vs master)

## 📝 생성되는 파일

### `.azure-cicd-config`
설정 정보가 저장되는 파일 (Git에 커밋하지 마세요!)

```bash
# GitHub 저장소
REPO_OWNER="asomi7007"
REPO_NAME="affinity-app"

# Azure 구독
SUBSCRIPTION_ID="abc12345-..."
TENANT_ID="87654321-..."

# Azure 리소스
RESOURCE_GROUP="affinity-app-rg-20251107-a1b2"
LOCATION="koreacentral"

# Container Apps
CONTAINER_APP_NAME="affinity-app"
CONTAINER_APP_ENV="affinity-app-env"

# Service Principal
APP_ID="12345678-..."
```

이 파일은 나중에 설정을 다시 확인하거나 문제 해결 시 유용합니다.

## 💡 팁

1. **기본값 사용**: 대부분의 경우 엔터만 쳐도 됩니다!
2. **GitHub CLI 로그인**: 미리 로그인해두면 Secrets 자동 설정 가능
3. **설정 파일 보관**: `.azure-cicd-config` 파일을 안전하게 보관
4. **재실행 가능**: 같은 설정으로 여러 번 실행해도 안전 (멱등성)

## 🔗 관련 문서

- [README.md](../README.md#github-actions로-자동-배포-cicd) - 전체 프로젝트 가이드
- [.github/SETUP_CICD.md](SETUP_CICD.md) - 수동 설정 상세 가이드
- [.github/workflows/ci-cd.yml](workflows/ci-cd.yml) - 워크플로우 파일
