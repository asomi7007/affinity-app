# GitHub Actions CI/CD 설정 가이드

이 문서는 **코드 푸시만 하면 자동으로 Azure Container Apps에 배포**되는 CI/CD 파이프라인 설정 방법을 안내합니다.

## 🎯 최종 결과

```
git push origin main
  ↓
[자동] 테스트 실행 (Python + TypeScript)
  ↓
[자동] Docker 이미지 빌드 → GitHub Container Registry 푸시
  ↓
[자동] Azure Container Apps 배포 (생성 or 업데이트)
  ↓
✅ 앱이 https://your-app.koreacentral.azurecontainerapps.io 에서 실행!
```

## 📋 사전 준비 사항

### 1. Azure CLI 설치 및 로그인

```bash
# Azure CLI 설치 (macOS)
brew update && brew install azure-cli

# 또는 Linux
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Windows
winget install -e --id Microsoft.AzureCLI

# 로그인
az login
```

### 2. Azure 구독 확인

```bash
# 구독 목록 확인
az account list --output table

# 사용할 구독 설정
az account set --subscription "구독ID또는이름"

# 현재 구독 확인
az account show --query "{Name:name, ID:id, TenantID:tenantId}" --output table
```

## 🔐 Step 1: Azure 서비스 주체 생성

GitHub Actions가 Azure 리소스를 관리할 수 있도록 서비스 주체(Service Principal)를 만듭니다.

### 방법 1: Federated Credentials (권장 - 비밀번호 불필요)

```bash
# 1. 리소스 그룹 생성 (없으면)
RESOURCE_GROUP="affinity-app-rg"
LOCATION="koreacentral"
az group create --name $RESOURCE_GROUP --location $LOCATION

# 2. App Registration 생성
APP_NAME="affinity-app-deployer"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

APP_ID=$(az ad app create \
  --display-name $APP_NAME \
  --query appId -o tsv)

echo "Application (Client) ID: $APP_ID"

# 3. Service Principal 생성
az ad sp create --id $APP_ID

SP_OBJECT_ID=$(az ad sp show --id $APP_ID --query id -o tsv)

# 4. Contributor 역할 부여
az role assignment create \
  --assignee $APP_ID \
  --role Contributor \
  --scope /subscriptions/$SUBSCRIPTION_ID

# 5. Federated Credential 생성
REPO_OWNER="asomi7007"  # GitHub 사용자명/조직명
REPO_NAME="affinity-app"  # 저장소 이름

az ad app federated-credential create \
  --id $APP_ID \
  --parameters '{
    "name": "github-actions-main",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:'"$REPO_OWNER/$REPO_NAME"':ref:refs/heads/main",
    "description": "GitHub Actions for main branch",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 6. 정보 출력 (GitHub Secrets에 저장)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "============================================"
echo "다음 값들을 GitHub Secrets에 저장하세요:"
echo "============================================"
echo "AZURE_CLIENT_ID: $APP_ID"
echo "AZURE_TENANT_ID: $TENANT_ID"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo "AZURE_RESOURCE_GROUP: $RESOURCE_GROUP"
echo "============================================"
```

### 방법 2: 기존 방식 (비밀번호 사용)

```bash
# 서비스 주체 생성 (한 줄)
az ad sp create-for-rbac \
  --name "affinity-app-deployer" \
  --role contributor \
  --scopes /subscriptions/{구독ID}/resourceGroups/{리소스그룹} \
  --sdk-auth

# 출력 예시:
# {
#   "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
#   "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
#   ...
# }
```

## 🔑 Step 2: GitHub Secrets 설정

1. GitHub 저장소로 이동
2. **Settings** → **Secrets and variables** → **Actions**
3. **New repository secret** 클릭
4. 다음 값들을 추가:

### 필수 Secrets

| Name | Value | 예시 |
|------|-------|------|
| `AZURE_CLIENT_ID` | Application (Client) ID | `12345678-1234-1234-1234-123456789abc` |
| `AZURE_TENANT_ID` | Directory (Tenant) ID | `87654321-4321-4321-4321-cba987654321` |
| `AZURE_SUBSCRIPTION_ID` | Subscription ID | `abcdef12-3456-7890-abcd-ef1234567890` |
| `AZURE_RESOURCE_GROUP` | 리소스 그룹 이름 | `affinity-app-rg` |
| `AZURE_CONTAINER_APP_NAME` | Container App 이름 | `affinity-app` |

### 선택 Secrets (기본값 사용 가능)

| Name | Value | 기본값 |
|------|-------|--------|
| `AZURE_CONTAINER_APP_ENV` | Container Apps 환경 이름 | `affinity-app-env` |
| `AZURE_LOCATION` | Azure 지역 | `koreacentral` |

## 📸 GitHub Secrets 설정 스크린샷 예시

```
Settings → Secrets and variables → Actions → New repository secret

┌────────────────────────────────────────────┐
│ Name *                                     │
│ AZURE_CLIENT_ID                            │
├────────────────────────────────────────────┤
│ Secret *                                   │
│ 12345678-1234-1234-1234-123456789abc       │
├────────────────────────────────────────────┤
│              [Add secret]                  │
└────────────────────────────────────────────┘
```

## ✅ Step 3: 워크플로우 활성화 확인

`.github/workflows/ci-cd.yml` 파일이 이미 준비되어 있습니다. 다음을 확인하세요:

```yaml
# 자동 트리거 조건
on:
  push:
    branches: [ main, develop ]  # main/develop 푸시 시 실행
  pull_request:
    branches: [ main ]  # PR 생성 시 테스트만 실행
```

## 🚀 Step 4: 배포 테스트

### 첫 배포 실행

```bash
# 1. 코드 변경 (예: README 수정)
echo "# CI/CD Test" >> README.md

# 2. 커밋 및 푸시
git add .
git commit -m "test: CI/CD 파이프라인 테스트"
git push origin main
```

### 진행 상황 확인

1. GitHub 저장소 → **Actions** 탭
2. 최근 워크플로우 실행 확인
3. 각 Job 클릭하여 로그 확인:
   - ✅ `test`: Python/TypeScript 테스트
   - ✅ `build-and-push`: Docker 이미지 빌드 및 푸시
   - ✅ `deploy-production`: Azure Container Apps 배포

### 배포 완료 확인

워크플로우가 성공하면 Summary에 앱 URL이 표시됩니다:

```
🎉 배포 완료!

Application URL: https://affinity-app.koreacentral-xxxxxx.azurecontainerapps.io
Image: ghcr.io/asomi7007/affinity-app:latest
Resource Group: affinity-app-rg

✅ Health Check Passed
```

## 🔍 문제 해결

### 1. "Federated credential validation failed"

**원인:** GitHub 저장소 경로가 잘못됨

**해결:**
```bash
# Federated Credential 다시 확인
az ad app federated-credential list --id $APP_ID

# subject가 "repo:OWNER/REPO:ref:refs/heads/main" 형식인지 확인
# 잘못되었으면 삭제 후 재생성
az ad app federated-credential delete --id $APP_ID --federated-credential-id {ID}
```

### 2. "Resource group not found"

**원인:** 리소스 그룹이 없거나 이름이 다름

**해결:**
```bash
# 리소스 그룹 생성
az group create \
  --name affinity-app-rg \
  --location koreacentral
```

### 3. Docker 이미지 Pull 실패

**원인:** GitHub Container Registry 권한 문제

**해결:**
1. GitHub 저장소 → **Settings** → **Actions** → **General**
2. **Workflow permissions** → **Read and write permissions** 선택
3. **Allow GitHub Actions to create and approve pull requests** 체크

### 4. Container App 생성 실패

**원인:** Container Apps 환경 생성 권한 부족

**해결:**
```bash
# 수동으로 환경 먼저 생성
az containerapp env create \
  --name affinity-app-env \
  --resource-group affinity-app-rg \
  --location koreacentral
```

## 📊 CI/CD 파이프라인 플로우

```
┌─────────────────────────────────────────────────────────────────┐
│                    개발자가 코드 푸시 (main)                     │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
        ▼                                 ▼
  ┌─────────┐                      ┌──────────┐
  │ Python  │                      │   Node   │
  │ 테스트  │                      │ TypeCheck│
  └────┬────┘                      └────┬─────┘
       │                                │
       └────────────┬───────────────────┘
                    │ (테스트 통과)
                    ▼
          ┌──────────────────┐
          │ Docker 이미지     │
          │ 빌드 및 푸시      │
          │ → GHCR           │
          └────────┬─────────┘
                   │
                   ▼
          ┌──────────────────┐
          │ Container App    │
          │ 존재 여부 확인   │
          └────────┬─────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌────────┐           ┌────────┐
   │ 신규   │           │ 업데이트│
   │ 생성   │           │ 이미지  │
   └────┬───┘           └───┬────┘
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  Health Check   │
         │  (30초 후)      │
         └────────┬────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  배포 완료!     │
         │  URL 출력       │
         └─────────────────┘
```

## 🎓 다음 단계

### 1. 스테이징 환경 추가

`develop` 브랜치 푸시 시 스테이징 환경에 배포:

```bash
# 스테이징 리소스 그룹 생성
az group create --name affinity-app-staging-rg --location koreacentral

# GitHub Secrets 추가
# - AZURE_RESOURCE_GROUP_STAGING
# - AZURE_CONTAINER_APP_NAME_STAGING
```

### 2. 자동 롤백 설정

Health Check 실패 시 이전 버전으로 자동 롤백:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    az containerapp revision list \
      --name ${{ secrets.AZURE_CONTAINER_APP_NAME }} \
      --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }} \
      --query "[?properties.active].name" -o tsv | head -2 | tail -1 | \
    xargs -I {} az containerapp revision activate \
      --revision {} \
      --resource-group ${{ secrets.AZURE_RESOURCE_GROUP }}
```

### 3. Slack/Teams 알림 추가

```yaml
- name: Notify Slack
  if: always()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📚 참고 자료

- [Azure Container Apps 문서](https://learn.microsoft.com/azure/container-apps/)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Workload Identity Federation](https://learn.microsoft.com/azure/active-directory/workload-identities/workload-identity-federation)
- [GitHub Container Registry](https://docs.github.com/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

---

## 💡 팁

### GitHub Container Registry 이미지 공개 설정

1. GitHub 프로필 → **Packages**
2. `affinity-app` 패키지 클릭
3. **Package settings** → **Change visibility** → **Public**

이제 누구나 `docker pull ghcr.io/asomi7007/affinity-app:latest` 가능!

### 비용 절약

무료로 사용 가능:
- ✅ GitHub Actions: 월 2,000분 (public repo는 무제한)
- ✅ GitHub Container Registry: 500MB (public 무제한)
- ✅ Azure Container Apps: 월 180,000 vCPU-초 + 360,000 GiB-초 무료

최소 스펙 권장: `--cpu 0.25 --memory 0.5Gi`
