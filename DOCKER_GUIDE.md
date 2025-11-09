# 🐳 Docker 실행 가이드

## ⚠️ Codespaces에서의 제한사항

GitHub Codespaces에서는 Docker 데몬을 직접 실행하기 어렵습니다.
**개발 환경**으로는 현재처럼 `./start.sh`를 사용하는 것을 권장합니다.

## 🚀 Docker 이미지 실행 방법

### 1. 로컬 컴퓨터에서 실행 (Docker Desktop 필요)

```bash
# 이미지 다운로드
docker pull ghcr.io/asomi7007/affinity-app:latest

# 컨테이너 실행
docker run -d \
  --name affinity-app \
  -p 8000:8000 \
  ghcr.io/asomi7007/affinity-app:latest

# 브라우저에서 접속
# http://localhost:8000
```

### 2. Docker Compose로 실행

```bash
# docker-compose.yml 파일이 있는 디렉토리에서
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 3. 서버에서 실행 (Linux)

```bash
# Docker 설치 (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 이미지 pull 및 실행
docker pull ghcr.io/asomi7007/affinity-app:latest
docker run -d \
  --name affinity-app \
  --restart unless-stopped \
  -p 80:8000 \
  ghcr.io/asomi7007/affinity-app:latest
```

## 🌐 클라우드 배포

### Azure Container Apps (자동 배포 설정됨)

현재 프로젝트는 Azure Container Apps 자동 배포가 설정되어 있습니다.
Azure 자격 증명을 설정하면 `main` 브랜치에 push할 때마다 자동으로 배포됩니다.

**설정 방법:**
1. Azure 포털에서 Container Apps 생성
2. GitHub Secrets에 Azure 자격 증명 추가:
   - `AZURE_CLIENT_ID`
   - `AZURE_TENANT_ID`
   - `AZURE_SUBSCRIPTION_ID`

3. 자동 배포 워크플로우 실행됨

### 기타 클라우드 플랫폼

#### Railway.app (추천 - 무료 티어)
```bash
# Railway CLI 설치
npm install -g @railway/cli

# 로그인
railway login

# 프로젝트 생성 및 배포
railway init
railway up
```

#### Render.com (무료 티어)
1. Render 대시보드에서 "New Web Service" 클릭
2. GitHub 저장소 연결
3. Docker 이미지 선택: `ghcr.io/asomi7007/affinity-app:latest`
4. 자동 배포됨

#### Fly.io
```bash
# Fly CLI 설치
curl -L https://fly.io/install.sh | sh

# 로그인
fly auth login

# 앱 실행
fly launch
fly deploy
```

## 📋 유용한 Docker 명령어

```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 로그 확인
docker logs affinity-app

# 컨테이너 중지
docker stop affinity-app

# 컨테이너 재시작
docker restart affinity-app

# 컨테이너 삭제
docker rm -f affinity-app

# 이미지 업데이트
docker pull ghcr.io/asomi7007/affinity-app:latest
docker stop affinity-app
docker rm affinity-app
docker run -d --name affinity-app -p 8000:8000 ghcr.io/asomi7007/affinity-app:latest
```

## 🔍 트러블슈팅

### 포트가 이미 사용 중
```bash
# 8000 포트를 사용하는 프로세스 확인
lsof -i :8000

# 다른 포트로 실행
docker run -d --name affinity-app -p 3000:8000 ghcr.io/asomi7007/affinity-app:latest
```

### 컨테이너가 시작되지 않음
```bash
# 상세 로그 확인
docker logs affinity-app

# 컨테이너 내부 접속
docker exec -it affinity-app /bin/sh
```

### 이미지 업데이트 안 됨
```bash
# 캐시 무시하고 pull
docker pull ghcr.io/asomi7007/affinity-app:latest --no-cache

# 또는 특정 태그 사용
docker pull ghcr.io/asomi7007/affinity-app:main
```

## 💡 권장 사항

- **개발**: Codespaces에서 `./start.sh` 사용 (현재 방식)
- **테스트**: 로컬에서 Docker 실행
- **프로덕션**: Azure/Railway/Render 등 클라우드 배포
