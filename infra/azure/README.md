# Azure 배포 가이드

## 구성 요소
- Backend: Azure Web App (Container) 또는 Azure Container Apps
- Realtime: 초기에는 자체 WebSocket (App Service). 확장 시 Azure Web PubSub
- Frontend: Azure Static Web Apps 또는 Storage 정적 웹사이트 + CDN
- CI/CD: GitHub Actions (`.github/workflows/ci-cd.yml`)

## 사전 준비
1. Azure 구독 및 권한
2. 리소스 그룹 생성 (예: `rg-affinity-dev`)
3. Container Registry (선택: GHCR 사용 시 생략 가능)
4. Web App for Containers 생성 (Linux,  B1 이상 권장)

## GitHub Secrets 필요 목록
- `AZURE_CREDENTIALS`: `az ad sp create-for-rbac --name affinity-sp --role contributor --scopes /subscriptions/<SUB_ID>/resourceGroups/<RG_NAME> --sdk-auth` 출력 JSON
- `AZURE_WEBAPP_NAME`: 생성한 Web App 이름
- (선택) `WEB_PUBSUB_CONNECTION`: Azure Web PubSub 연결 문자열

## 로컬 개발
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd ../frontend
npm install
npm run dev
```

## Web PubSub 연동 개요 (향후)
1. Azure Portal에서 Web PubSub 서비스 생성
2. Connection String을 Backend 환경변수로 주입
3. Backend에서 WebSocket 서버 대신 Web PubSub SDK 사용 브로드캐스트

## 확장 시 고려사항
- 인증/인가: Azure AD B2C 또는 Entra ID 통합
- 데이터 영속화: Azure PostgreSQL / Cosmos DB + Redis 캐시
- Observability: Azure Application Insights
- IaC: Bicep 또는 Terraform 으로 인프라 선언적 관리
