# Affinity Diagram Backend

FastAPI 기반 실시간 어피니티 다이어그램 백엔드.

## 실행 (로컬)
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 엔드포인트
- `GET /health` 헬스체크
- `GET /api/boards/` 보드 목록
- `POST /api/boards/` 보드 생성 `{ "title": "My Board" }`
- `GET /api/boards/{id}` 단일 보드
- `POST /api/boards/{id}/notes` 노트 추가 `{ "text": "아이디어" }`
- `WS /ws/board/{id}` 실시간 이벤트 브로드캐스트 (노트 이동 등 클라이언트 동기화 용)

## 테스트
```bash
pytest -q
```

## 향후 확장
- 지속 저장 (PostgreSQL + SQLModel/SQLAlchemy)
- 인증 (Azure AD / JWT)
- 이벤트 타입 정의 및 버전 관리
- Redis Pub/Sub 또는 Azure Web PubSub 연동
