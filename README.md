# Affinity Diagram Web App

FastAPI + React (Vite) 기반 실시간 어피니티 다이어그램 협업 도구입니다.  
**GitHub Codespaces에서 개발 → Docker 컨테이너 빌드 → Azure Container Apps 배포** 전체 과정을 체험하는 핸즈온 프로젝트입니다.

## 📚 프로젝트 소개

### 어피니티 다이어그램이란?
어피니티 다이어그램(Affinity Diagram)은 브레인스토밍으로 나온 아이디어를 포스트잇에 적고, 유사한 것끼리 그룹화하여 패턴을 발견하는 UX 디자인 방법론입니다. 이 앱은 이 과정을 **실시간 온라인 협업**으로 구현했습니다.

### 핵심 기능
- 🔄 **실시간 협업**: WebSocket으로 여러 사용자가 동시 작업
- 📝 **포스트잇 관리**: 드래그 앤 드롭으로 자유롭게 배치
- 📊 **2x2 매트릭스**: 중요도/긴급도 등 기준으로 분류
- 🌐 **한글 완벽 지원**: IME(Input Method Editor) 처리로 자모 분리 없음
- 🎨 **5가지 색상**: 주제별로 색상 구분

## 🏗️ 아키텍처 및 기술 스택

### 전체 시스템 구조
```
┌─────────────────────────────────────────────────────────────┐
│                    브라우저 (클라이언트)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           React + TypeScript (Vite)                  │  │
│  │  • 실시간 UI 업데이트 (300ms debounce)               │  │
│  │  • WebSocket 커스텀 훅                               │  │
│  │  • IME 조합 이벤트 처리                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↕ WebSocket (wss://)
┌─────────────────────────────────────────────────────────────┐
│                    서버 (백엔드)                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              FastAPI + WebSocket                     │  │
│  │  • 비동기 처리 (async/await)                         │  │
│  │  • Connection Manager (연결 풀)                      │  │
│  │  • In-Memory 상태 관리                               │  │
│  │  • 버전 관리 (Last Writer Wins)                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Frontend 구조
```
frontend/
├── src/
│   ├── modules/
│   │   ├── AffinityDiagramApp.tsx    # 메인 앱 (보드 + 포스트잇 관리)
│   │   ├── StickyNote.tsx            # 개별 포스트잇 컴포넌트 (드래그)
│   │   └── Board.tsx                 # 보드 레이아웃
│   ├── ws/
│   │   └── useWebSocket.ts           # WebSocket 훅 (자동 재연결)
│   └── index.css                     # Tailwind CSS
├── .env.local                        # 환경변수 (Codespaces 자동 생성)
└── vite.config.ts                    # Vite 설정 (HMR, 프록시)
```

**주요 기술:**
- **React 18**: Concurrent 기능, 자동 배칭
- **TypeScript**: 타입 안정성 및 IntelliSense
- **Vite**: 번개같이 빠른 HMR (Hot Module Replacement)
- **Tailwind CSS**: 유틸리티 우선 스타일링
- **Framer Motion**: 부드러운 애니메이션 (드래그)

### Backend 구조
```
backend/
├── app/
│   ├── main.py                       # FastAPI 앱 + 정적 파일 서빙
│   ├── api/
│   │   └── boards.py                 # REST API 엔드포인트
│   ├── ws/
│   │   └── manager.py                # WebSocket Connection Manager
│   ├── schemas/
│   │   └── board.py                  # Pydantic 모델
│   └── services/
│       └── boards.py                 # 비즈니스 로직
└── requirements.txt                  # Python 의존성
```

**주요 기술:**
- **FastAPI**: 고성능 비동기 웹 프레임워크
- **WebSocket**: 양방향 실시간 통신 (ws:// / wss://)
- **Pydantic**: 데이터 검증 및 JSON 직렬화
- **Uvicorn**: ASGI 서버

### 실시간 동기화 작동 원리

#### 1. 연결 및 초기 동기화
```
Client A                    Server                  Client B
   │                          │                         │
   ├──── WebSocket 연결 ─────▶│                         │
   │◀──── sync.state ─────────┤ (현재 보드 상태 전송)   │
   │                          │◀──── WebSocket 연결 ────┤
   │                          ├──── sync.state ────────▶│
```

#### 2. 포스트잇 생성 시
```
Client A                    Server                  Client B
   │                          │                         │
   ├──── note.add ───────────▶│                         │
   │                          ├ (메모리에 저장)         │
   │                          ├──── note.add ─────────▶│ (브로드캐스트)
   │◀──── note.add ───────────┤ (본인 확인용)           │
```

#### 3. 실시간 텍스트 입력 시 (한글 지원)
```
사용자 입력          Frontend              Server              다른 사용자
    │                   │                     │                    │
 "ㅎ" 입력 ─▶ compositionStart                │                    │
 "하" 입력 ─▶ compositionUpdate (로컬만)      │                    │
 "한" 입력 ─▶ compositionUpdate (로컬만)      │                    │
 "한글" 완성 ─▶ compositionEnd ──┐            │                    │
                                  ├─ 300ms debounce               │
                                  └─────────▶ note.update ────────▶ 실시간 표시
```

**핵심 포인트:**
- **한글 조합 중**: 로컬 화면만 업데이트 (서버 전송 X)
- **조합 완료 후**: 300ms 내 추가 입력 없으면 서버 전송
- **빠른 타이핑**: Debounce로 네트워크 부하 최소화

#### 4. 버전 관리 (충돌 방지)
```javascript
// 서버가 모든 이벤트에 버전 번호 부여
{
  type: 'note.update',
  id: 'abc123',
  text: '새로운 내용',
  version: 42  // ← 서버가 자동 증가
}

// 클라이언트는 오래된 버전 무시
if (message.version <= localVersion) {
  return; // 무시
}
```

**LWW (Last Writer Wins) 전략:**
- 마지막 변경이 이김 (간단하지만 충돌 가능)
- 향후 CRDT(Conflict-free Replicated Data Type) 적용 예정

## 🎮 앱 사용 방법

### 1. 포스트잇 추가
1. 좌측 팔레트에서 **색상 버튼** 클릭
2. 보드 중앙에 새 포스트잇 생성
3. 자동으로 **편집 모드** 진입

### 2. 내용 입력 및 편집
- **더블클릭**: 편집 모드 시작
- **Enter**: 편집 완료 (내용 저장)
- **Shift+Enter**: 줄바꿈
- **Esc**: 편집 취소 (변경 사항 버림)

**한글 입력 팁:**
- "한글"처럼 조합이 완료되면 자동으로 다른 사용자에게 전송
- 빠르게 타이핑해도 글자가 사라지지 않음

### 3. 포스트잇 이동
- 포스트잇을 **드래그**하여 원하는 위치로
- 근처 포스트잇에 **자동 정렬** (Snap)
- 이동 중에도 실시간으로 다른 사용자에게 표시

### 4. 포스트잇 고정
- 우측 상단 **📌 핀 버튼** 클릭
- 고정된 포스트잇은 드래그 불가 (실수 방지)

### 5. 분면 모드 (2x2 매트릭스)
1. 상단 툴바에서 **4분면 버튼** 클릭
2. 분면 제목 클릭하여 편집 (예: "중요도 높음")
3. 포스트잇을 분면에 배치하여 분류

### 6. 실시간 협업
- 같은 URL을 여러 명이 동시 접속
- 누가 무엇을 하는지 실시간으로 확인
- 충돌 걱정 없이 자유롭게 작업

## 🚀 시작하기 (3가지 방법)

### 방법 1: GitHub Codespaces (추천 - 핸즈온용)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/asomi7007/affinity-app)

**Codespaces란?**
- GitHub이 제공하는 **클라우드 개발 환경**
- 브라우저에서 VS Code를 실행하여 즉시 개발 가능
- 환경 설정 자동화 (.devcontainer/devcontainer.json)

**자동으로 설정되는 것들:**
- ✅ Python 3.12 + Node.js 18 설치
- ✅ VS Code 확장 (Python, ESLint, Tailwind 등)
- ✅ 백엔드/프론트엔드 의존성 자동 설치
- ✅ 포트 포워딩 (5173, 8000) Public 설정
- ✅ 환경변수 자동 생성 (.env.local)

**실행 단계:**
```bash
# 1. Codespaces 생성 (위 버튼 클릭)
# 2. 터미널에서 실행
./start.sh

# 3. VS Code 하단 PORTS 탭에서 5173 포트 클릭
# 4. 브라우저에서 앱 열림!
```

**⚠️ 중요: 포트 가시성 확인**
WebSocket이 작동하려면 **포트 8000이 Public**이어야 합니다:
1. VS Code 하단 **"PORTS"** 탭 클릭
2. 8000 포트 찾기
3. "Visibility" 열 확인
4. "Private"이면 **우클릭 → Port Visibility → Public** 선택

**자동 설정 파일:**
```json
// .devcontainer/devcontainer.json
{
  "forwardPorts": [5173, 8000],
  "portsAttributes": {
    "8000": {
      "label": "FastAPI Backend",
      "visibility": "public"  // ← 자동 Public 설정
    }
  }
}
```


### 방법 2: 로컬 개발 환경

**요구사항:**
- Python 3.12+
- Node.js 18+
- Git

**설치 및 실행:**
```bash
# 저장소 클론
git clone https://github.com/asomi7007/affinity-app.git
cd affinity-app

# 간편 실행 (권장)
./start.sh

# 또는 수동 실행
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Frontend (새 터미널)
cd frontend
npm install
npm run dev -- --host
```

**접속:**
- 프론트엔드: http://localhost:5173
- 백엔드 API: http://localhost:8000
- API 문서: http://localhost:8000/docs

### 방법 3: Docker로 실행

**한 줄로 실행:**
```bash
docker run -p 8000:8000 ghcr.io/asomi7007/affinity-app:latest
```

**로컬에서 빌드:**
```bash
docker build -t affinity-app .
docker run -p 8000:8000 affinity-app
```

**Docker Compose (개발용):**
```bash
docker-compose up
```

## 🐳 Docker 컨테이너 이해하기

### 멀티 스테이지 빌드 전략
```dockerfile
# ============ Stage 1: Frontend 빌드 ============
FROM node:18 AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# 결과: /app/frontend/dist 에 정적 파일 생성

# ============ Stage 2: 최종 이미지 ============
FROM python:3.12-slim
WORKDIR /app

# Backend 복사 및 설치
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# Frontend 빌드 결과물 복사
COPY --from=frontend-builder /app/frontend/dist ./static

# FastAPI가 정적 파일도 서빙
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**왜 멀티 스테이지?**
- ✅ **이미지 크기 감소**: Node.js 런타임 제외 (300MB → 150MB)
- ✅ **빌드 도구 분리**: 개발 도구가 프로덕션에 포함 안 됨
- ✅ **보안 강화**: 불필요한 패키지 제거

**정적 파일 서빙:**
```python
# backend/app/main.py
from fastapi.staticfiles import StaticFiles

# React 빌드 파일 서빙
app.mount("/", StaticFiles(directory="static", html=True), name="static")
```

## ☁️ Azure Container Apps 배포

### GitHub Actions로 자동 배포 (CI/CD)

**🚀 가장 강력한 방법 - 코드 푸시만 하면 끝!**

**장점:**
- ✅ `git push` 한 번으로 자동 빌드 → 테스트 → 배포
- ✅ 버전 관리 및 자동 롤백 가능
- ✅ Health Check 자동 실행
- ✅ 프로덕션 Best Practice

**작동 방식:**
```
git push origin main
  ↓
GitHub Actions 자동 실행
  ↓
1. Python + TypeScript 테스트
  ↓
2. Docker 이미지 빌드 → GitHub Container Registry
  ↓
3. Azure Container Apps 자동 배포 (생성 or 업데이트)
  ↓
4. Health Check (/docs 엔드포인트)
  ↓
✅ 앱 URL이 GitHub Actions Summary에 표시!
```

**⚡ 초간단 설정 (대화형 스크립트):**

```bash
# 자동 설정 스크립트 실행
./scripts/setup-azure-cicd.sh
```

**스크립트가 자동으로 해주는 것:**
1. ✅ Azure CLI 설치 여부 확인 (없으면 자동 설치)
2. ✅ Azure 로그인 (브라우저 인증)
3. ✅ 구독 선택 (1개면 자동, 여러개면 선택)
4. ✅ GitHub 저장소 정보 자동 감지
5. ✅ 리소스 이름 자동 생성 (또는 커스터마이징)
6. ✅ 리소스 그룹 생성
7. ✅ Azure AD 앱 및 서비스 주체 생성
8. ✅ Federated Credential 설정 (비밀번호 불필요!)
9. ✅ GitHub Secrets 자동 설정 (GitHub CLI 사용)

**대화형 예시:**
```bash
$ ./scripts/setup-azure-cicd.sh

╔═══════════════════════════════════════════════════════════╗
║        Azure CI/CD 자동 설정 스크립트                     ║
╚═══════════════════════════════════════════════════════════╝

✅ Azure CLI가 이미 설치되어 있습니다 (버전: 2.65.0)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔑 Azure 로그인
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 이미 Azure에 로그인되어 있습니다.
현재 계정:
  이름: My Subscription
  구독 ID: abc123...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ Azure 리소스 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

프로젝트 이름 (영문, 숫자, 하이픈만 가능) [기본값: affinity-app]: 
리소스 그룹 이름 [기본값: affinity-app-rg-20251107-a1b2]: 
Azure 지역 [기본값: koreacentral]: 
Container App 이름 [기본값: affinity-app]: 
...

✅ 설정 완료!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 GitHub Secrets 설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GitHub CLI를 사용하여 자동으로 Secrets를 설정하시겠습니까? [Y/n]: 

✅ GitHub Secrets 자동 설정 완료!
```

**설정 후 바로 테스트:**
```bash
# 코드 수정
echo "# CI/CD Test" >> README.md

# 커밋 및 푸시
git add .
git commit -m "test: CI/CD pipeline"
git push origin main

# GitHub Actions 확인
# https://github.com/asomi7007/affinity-app/actions
```

**📚 상세 설정 가이드:** [.github/SETUP_CICD.md](.github/SETUP_CICD.md) 참고

**💡 팁:**
- 모든 값은 기본값 제공 (엔터만 치면 OK)
- GitHub CLI 로그인되어 있으면 Secrets도 자동 설정
- 설정 정보는 `.azure-cicd-config` 파일에 저장됨
- Codespaces에는 Azure CLI가 자동 설치됨

### 수동 배포 (스크립트)

**간편 배포 (권장):**
```bash
# 실행 권한 부여
chmod +x scripts/deploy.sh

# 기본 설정으로 배포
./scripts/deploy.sh

# 커스텀 설정
./scripts/deploy.sh "ghcr.io/asomi7007/affinity-app:v1.0" "koreacentral"
```

**PowerShell:**
```powershell
.\scripts\deploy.ps1 -ContainerImage "ghcr.io/asomi7007/affinity-app:latest"
```

**자동화 내용:**
1. ✅ 리소스 그룹 생성 (affinityapp-YYYYMMDD-XXXX)
2. ✅ Container Apps 환경 구성
3. ✅ What-If 분석 (변경 사항 미리보기)
4. ✅ 컨테이너 배포
5. ✅ 공개 URL 생성 및 출력

### Azure Portal "Deploy to Azure" 버튼

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fasomi7007%2Faffinity-app%2Fmain%2Finfra%2Fazure%2Fmain.json)

**장점:**
- ✅ 클릭 한 번으로 배포
- ✅ GUI로 파라미터 입력
- ✅ Azure 초보자에게 적합

**단점:**
- ❌ 버전 관리 어려움
- ❌ CI/CD 파이프라인 없음
- ❌ 매번 수동으로 버튼 클릭 필요

**배포 단계:**
1. 위 버튼 클릭
2. Azure 포털 로그인
3. 파라미터 입력:
   - **Project Name**: `affinity-app`
   - **Location**: `Korea Central`
   - **Container Image**: `ghcr.io/asomi7007/affinity-app:latest`
4. **Review + Create** → **Create**
5. 5-10분 후 배포 완료

**배포 후 URL 확인:**
```bash
az containerapp show \
  --name affinity-app \
  --resource-group affinity-app-rg \
  --query "properties.latestRevisionFqdn" \
  -o tsv
```

### 배포 방법 비교

| 방법 | 장점 | 단점 | 추천 대상 |
|------|------|------|----------|
| **GitHub Actions** | • 자동 CI/CD<br>• 버전 관리<br>• 롤백 가능 | • 초기 설정 복잡 | 프로덕션 환경 |
| **스크립트 (deploy.sh)** | • 빠른 배포<br>• 커스터마이징 쉬움 | • 수동 실행 필요 | 개발/테스트 |
| **Deploy to Azure 버튼** | • 클릭 한 번<br>• 설정 간단 | • 버전 관리 X<br>• 자동화 X | 데모/PoC |

## 📁 프로젝트 파일 구조
```
affinity-app/
├── .github/
│   └── workflows/
│       └── ci-cd.yml              # GitHub Actions 워크플로우
├── .devcontainer/
│   ├── devcontainer.json          # Codespaces 설정
│   └── post-create.sh             # 초기화 스크립트
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI 앱 + 정적 파일 서빙
│   │   ├── api/
│   │   │   └── boards.py          # REST API 엔드포인트
│   │   ├── ws/
│   │   │   └── manager.py         # WebSocket Connection Manager
│   │   ├── schemas/
│   │   │   └── board.py           # Pydantic 모델 (데이터 검증)
│   │   └── services/
│   │       └── boards.py          # 비즈니스 로직
│   ├── requirements.txt           # Python 패키지
│   └── Dockerfile                 # Backend 전용 (개발용)
├── frontend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── AffinityDiagramApp.tsx  # 메인 컴포넌트
│   │   │   ├── StickyNote.tsx          # 포스트잇 컴포넌트
│   │   │   └── Board.tsx               # 보드 레이아웃
│   │   ├── ws/
│   │   │   └── useWebSocket.ts         # WebSocket 훅
│   │   └── vite-env.d.ts               # Vite 타입 정의
│   ├── .env.local                 # 로컬 환경변수 (자동 생성)
│   ├── .env.development           # 개발 환경 기본값
│   ├── .env.production            # 프로덕션 환경 기본값
│   ├── package.json               # Node.js 패키지
│   └── vite.config.ts             # Vite 설정
├── infra/
│   └── azure/
│       ├── main.bicep             # Azure 리소스 정의 (IaC)
│       ├── main.json              # ARM 템플릿 (Bicep 컴파일 결과)
│       └── README.md              # Azure 배포 가이드
├── scripts/
│   ├── deploy.sh                  # 배포 자동화 (Bash)
│   ├── deploy.ps1                 # 배포 자동화 (PowerShell)
│   ├── cleanup.sh                 # 리소스 정리
│   ├── setup-env.sh               # 환경변수 자동 생성 (Codespaces)
│   └── setup-ports.sh             # 포트 가시성 설정
├── Dockerfile                     # 멀티 스테이지 빌드
├── docker-compose.yml             # 로컬 개발용
├── start.sh                       # 개발 서버 시작
├── stop.sh                        # 개발 서버 종료
└── README.md                      # 이 파일
```

## Debug & 진단 도구
실시간 드래그 / 생성 문제를 빠르게 진단하기 위한 런타임 플래그와 패널을 제공합니다.

### 디버그 패널
프론트 우상단 `Debug ▼` 버튼을 클릭하면 패널이 열립니다.

토글 가능한 옵션:
- `DEBUG_CREATE`: 포스트잇 생성 시 콘솔에 좌표/DOM Rect 로그
- `DEBUG_DRAG`: 드래그 시작/라이브 전송/종료 요약 로그
- `DEBUG_DRAG_VERBOSE`: 매 pointermove 스냅 적용 후 좌표 상세 로그 (소음 多)

패널 하단에는 현재 드래그 전송 정책이 표시됩니다:
- Throttle 간격: 90ms (최근 좌표 큐 → note.move 브로드캐스트)
- 주기적 flush: 120ms (사용자 입력 적을 때 잔여 큐 비우기)
- pointerup 시 최종 flush 보장

### 콘솔 수동 설정
패널 외에도 브라우저 콘솔에서 직접 설정 가능:
```js
window.DEBUG_CREATE = true;      // 생성 로그
window.DEBUG_DRAG = true;        // 기본 드래그 라이프사이클 로그
window.DEBUG_DRAG_VERBOSE = true;// 상세 이동 로그 (성능 영향)
```
끄기:
```js
window.DEBUG_DRAG_VERBOSE = false;
```

### Hover Outline
포스트잇 위에 포인터가 올라가면 파란 outline 이 나타나 타깃이 명확히 식별됩니다 (드래그 중 제외). 이는 포인터 이벤트 버블/레이어 문제로 인해 클릭 대상이 어긋나는지 확인할 때 유용합니다.

### 드래그 실시간 전송
기존: pointerup 시 단발 전송 → 개선: 이동 중 주기적(note.move) 실시간 공유. 느린 네트워크에서도 최종 위치는 pointerup flush 로 정확히 동기화됩니다.

### 문제 재현 팁
1. Debug Panel 열기 → DRAG / DRAG_VERBOSE 활성
2. 포스트잇 여러 개 생성 후 겹치거나 근접 배치
3. 드래그하여 자석(snap) 정렬 동작과 전송 로그 타이밍 비교
4. 다른 브라우저(또는 시크릿 창)에서 동일한 보드 관찰

### 추가 예정
- 드래그 경로 히트맵 시각화 옵션
- Latency 측정(ping) 및 평균 전송량 표시
- 서버 authoritative 이동 거부 시(향후) 경고 배지

## 라이선스
- 추후 결정
