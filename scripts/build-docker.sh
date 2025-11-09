#!/bin/bash
# Docker 이미지 빌드 및 GHCR 푸시 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 설정
REGISTRY="ghcr.io"
REPOSITORY="asomi7007/affinity-app"
IMAGE_NAME="${REGISTRY}/${REPOSITORY}"

echo -e "${GREEN}=== Affinity App Docker Build & Push ===${NC}"

# Docker가 설치되어 있는지 확인
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker가 설치되어 있지 않습니다.${NC}"
    echo "Docker를 설치하려면: https://docs.docker.com/get-docker/"
    exit 1
fi

# Git 정보 가져오기
GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
GIT_COMMIT=$(git rev-parse --short HEAD)
VERSION=${1:-"latest"}

echo -e "${YELLOW}브랜치: ${GIT_BRANCH}${NC}"
echo -e "${YELLOW}커밋: ${GIT_COMMIT}${NC}"
echo -e "${YELLOW}버전: ${VERSION}${NC}"

# 이미지 태그 생성
TAGS=(
    "${IMAGE_NAME}:${VERSION}"
    "${IMAGE_NAME}:${GIT_BRANCH}-${GIT_COMMIT}"
)

if [ "${GIT_BRANCH}" == "main" ]; then
    TAGS+=("${IMAGE_NAME}:latest")
fi

# Docker 빌드 명령어 구성
BUILD_ARGS=""
for TAG in "${TAGS[@]}"; do
    BUILD_ARGS="${BUILD_ARGS} -t ${TAG}"
done

echo -e "\n${GREEN}1. Docker 이미지 빌드 중...${NC}"
docker build ${BUILD_ARGS} \
    --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
    --build-arg VCS_REF=${GIT_COMMIT} \
    --build-arg VERSION=${VERSION} \
    .

echo -e "\n${GREEN}✅ 이미지 빌드 완료${NC}"
echo -e "\n생성된 이미지:"
for TAG in "${TAGS[@]}"; do
    echo "  - ${TAG}"
done

# GHCR 로그인 확인
echo -e "\n${YELLOW}GHCR에 로그인하시겠습니까? (y/n)${NC}"
read -r PUSH_CONFIRM

if [ "${PUSH_CONFIRM}" == "y" ] || [ "${PUSH_CONFIRM}" == "Y" ]; then
    echo -e "\n${GREEN}2. GHCR 로그인...${NC}"
    echo "GitHub Personal Access Token을 입력하세요 (packages:write 권한 필요):"
    echo "또는 'gh auth token' 명령어를 사용하세요"
    
    if command -v gh &> /dev/null; then
        echo -e "${YELLOW}GitHub CLI가 감지되었습니다. 자동 로그인 시도...${NC}"
        echo $(gh auth token) | docker login ${REGISTRY} -u $(gh api user --jq .login) --password-stdin
    else
        docker login ${REGISTRY}
    fi
    
    echo -e "\n${GREEN}3. 이미지 푸시 중...${NC}"
    for TAG in "${TAGS[@]}"; do
        echo -e "${YELLOW}푸시 중: ${TAG}${NC}"
        docker push ${TAG}
    done
    
    echo -e "\n${GREEN}✅ 모든 이미지가 성공적으로 푸시되었습니다!${NC}"
    echo -e "\n이미지 사용 방법:"
    echo "  docker pull ${IMAGE_NAME}:${VERSION}"
    echo "  docker run -p 8000:8000 ${IMAGE_NAME}:${VERSION}"
else
    echo -e "\n${YELLOW}푸시를 건너뛰었습니다.${NC}"
    echo -e "\n로컬에서 실행하려면:"
    echo "  docker run -p 8000:8000 ${IMAGE_NAME}:${VERSION}"
fi

echo -e "\n${GREEN}=== 완료 ===${NC}"
