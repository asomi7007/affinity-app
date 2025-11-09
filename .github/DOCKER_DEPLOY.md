# Docker 배포 가이드

## 📦 Docker 이미지 자동 배포

이 프로젝트는 **GitHub Actions**를 통해 Docker 이미지를 자동으로 빌드하고 **GitHub Container Registry (GHCR)**에 배포합니다.

### 🔄 자동 배포 Workflow

#### 1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
- **트리거**: `main`, `develop` 브랜치에 push
- **작업**:
  1. ✅ 테스트 실행 (Python + TypeScript)
  2. 🏗️ 프론트엔드 빌드
  3. 🐳 Docker 이미지 빌드 및 GHCR 푸시
  4. 🚀 스테이징/프로덕션 배포 (브랜치별)

#### 2. **Container Publish** (`.github/workflows/container-publish.yml`)
- **트리거**: `main` 브랜치 또는 `backend/`, `frontend/`, `Dockerfile` 변경 시
- **작업**:
  1. 프론트엔드 빌드 및 백엔드에 통합
  2. Docker 이미지 빌드 (`latest` + SHA 태그)
  3. GHCR에 푸시
  4. Azure Bicep 파라미터 자동 업데이트

---

## 📋 배포 방법

### 방법 1: GitHub Actions (권장 ⭐)

코드를 `main` 브랜치에 push하면 자동으로 배포됩니다:

```bash
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

**배포 확인:**
1. GitHub 저장소 → **Actions** 탭
2. 실행 중인 workflow 클릭
3. 각 단계별 로그 확인

**이미지 확인:**
- 저장소 → **Packages** → `affinity-app`
- URL: `ghcr.io/asomi7007/affinity-app:latest`

---

### 방법 2: 로컬에서 수동 빌드

#### 사전 요구사항
- Docker 설치 필요
- GHCR 로그인 필요 (Personal Access Token with `write:packages`)

#### 빌드 스크립트 사용

```bash
# 실행 권한 부여
chmod +x scripts/build-docker.sh

# 빌드 및 푸시
./scripts/build-docker.sh [버전]

# 예시
./scripts/build-docker.sh v1.0.0
```

#### 수동 빌드 명령어

```bash
# 1. 이미지 빌드
docker build -t ghcr.io/asomi7007/affinity-app:latest .

# 2. GHCR 로그인
echo $GITHUB_TOKEN | docker login ghcr.io -u asomi7007 --password-stdin

# 3. 이미지 푸시
docker push ghcr.io/asomi7007/affinity-app:latest
```

---

## 🚀 배포된 이미지 사용

### Docker로 실행

```bash
# 이미지 다운로드
docker pull ghcr.io/asomi7007/affinity-app:latest

# 컨테이너 실행
docker run -d \
  -p 8000:8000 \
  --name affinity-app \
  ghcr.io/asomi7007/affinity-app:latest

# 접속
curl http://localhost:8000/health
```

### Docker Compose로 실행

```bash
# 프로덕션 모드
docker-compose up -d

# 개발 모드 (핫 리로드)
docker-compose -f docker-compose.dev.yml up
```

---

## 🏷️ 이미지 태그 전략

| 태그 | 설명 | 예시 |
|------|------|------|
| `latest` | main 브랜치 최신 버전 | `ghcr.io/asomi7007/affinity-app:latest` |
| `main-{sha}` | 특정 커밋 버전 | `ghcr.io/asomi7007/affinity-app:main-abc123def` |
| `develop-{sha}` | 개발 브랜치 버전 | `ghcr.io/asomi7007/affinity-app:develop-xyz789` |
| `v*` | 릴리스 태그 | `ghcr.io/asomi7007/affinity-app:v1.0.0` |

---

## 🔧 Dockerfile 구조

### Multi-stage Build
```
[Stage 1: Frontend Build]
- Node.js 18 Alpine
- npm ci + build
- 정적 파일 생성

[Stage 2: Backend Production]
- Python 3.12 Slim
- pip install
- 프론트엔드 dist 복사
- uvicorn 서버 실행
```

### 최적화
- ✅ Multi-stage build로 이미지 크기 최소화
- ✅ 프로덕션 전용 의존성만 설치
- ✅ Non-root 사용자로 실행
- ✅ Health check 내장
- ✅ BuildKit 캐싱 활용

---

## 🔐 GHCR 권한 설정

### GitHub Repository 설정
1. **Settings** → **Actions** → **General**
2. **Workflow permissions**: `Read and write permissions` 선택
3. **Allow GitHub Actions to create and approve pull requests** 체크

### Personal Access Token (수동 푸시용)
1. GitHub → **Settings** → **Developer settings** → **Personal access tokens**
2. **Generate new token (classic)**
3. 권한 선택:
   - ✅ `write:packages`
   - ✅ `read:packages`
   - ✅ `delete:packages`
4. 토큰 저장 후 사용:
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
echo $GITHUB_TOKEN | docker login ghcr.io -u asomi7007 --password-stdin
```

---

## 📊 배포 상태 확인

### GitHub Actions 로그
```bash
# GitHub CLI 사용
gh run list
gh run view <run-id>
gh run watch
```

### GHCR 이미지 확인
- URL: https://github.com/asomi7007/affinity-app/pkgs/container/affinity-app
- 또는: `docker pull ghcr.io/asomi7007/affinity-app:latest`

### 실행 중인 컨테이너 확인
```bash
docker ps
docker logs affinity-app
docker exec -it affinity-app /bin/bash
```

---

## 🐛 문제 해결

### "denied: permission_denied"
- GHCR 권한 확인
- Repository Actions 권한 확인
- Personal Access Token 재발급

### 빌드 실패
```bash
# 로컬에서 빌드 테스트
docker build -t test-build .

# 빌드 로그 확인
docker build --progress=plain -t test-build .
```

### 이미지가 너무 큼
```bash
# 이미지 크기 확인
docker images ghcr.io/asomi7007/affinity-app

# 레이어 분석
docker history ghcr.io/asomi7007/affinity-app:latest
```

---

## 📝 다음 단계

1. ✅ **GitHub에 코드 푸시** → 자동 배포 트리거
2. ⏳ **Actions 탭에서 빌드 진행 상황 확인**
3. ✅ **GHCR에서 이미지 확인**
4. 🚀 **Azure Container Apps에 배포** (별도 가이드 참조)

---

## 🔗 관련 문서
- [GitHub Container Registry 문서](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Azure 배포 가이드](../infra/azure/README.md)
