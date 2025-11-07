#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# 이모지
CHECK="✅"
CROSS="❌"
ROCKET="🚀"
GEAR="⚙️"
KEY="🔑"
INFO="ℹ️"
WARN="⚠️"
CELEBRATE="🎉"

# 로그 함수
log_info() {
    echo -e "${BLUE}${INFO} ${1}${NC}"
}

log_success() {
    echo -e "${GREEN}${CHECK} ${1}${NC}"
}

log_error() {
    echo -e "${RED}${CROSS} ${1}${NC}"
}

log_warn() {
    echo -e "${YELLOW}${WARN} ${1}${NC}"
}

log_header() {
    echo ""
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}${1}${NC}"
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 사용자 입력 받기 (기본값 지원)
prompt_input() {
    local prompt_text=$1
    local default_value=$2
    local result_var=$3
    
    if [ -n "$default_value" ]; then
        echo -e -n "${CYAN}${prompt_text} ${YELLOW}[기본값: ${default_value}]${NC}: "
    else
        echo -e -n "${CYAN}${prompt_text}${NC}: "
    fi
    
    read user_input
    
    if [ -z "$user_input" ] && [ -n "$default_value" ]; then
        eval $result_var="'$default_value'"
    else
        eval $result_var="'$user_input'"
    fi
}

# Yes/No 질문
prompt_confirm() {
    local prompt_text=$1
    local default_yes=$2
    
    if [ "$default_yes" = "true" ]; then
        echo -e -n "${CYAN}${prompt_text} ${YELLOW}[Y/n]${NC}: "
    else
        echo -e -n "${CYAN}${prompt_text} ${YELLOW}[y/N]${NC}: "
    fi
    
    read answer
    
    if [ "$default_yes" = "true" ]; then
        [[ -z "$answer" || "$answer" =~ ^[Yy] ]]
    else
        [[ "$answer" =~ ^[Yy] ]]
    fi
}

# Azure CLI 설치 확인 및 설치
check_and_install_azure_cli() {
    log_header "${GEAR} Azure CLI 확인"
    
    if command -v az &> /dev/null; then
        AZ_VERSION=$(az version --query '"azure-cli"' -o tsv 2>/dev/null || echo "unknown")
        log_success "Azure CLI가 이미 설치되어 있습니다 (버전: ${AZ_VERSION})"
        return 0
    fi
    
    log_warn "Azure CLI가 설치되어 있지 않습니다."
    
    if ! prompt_confirm "Azure CLI를 지금 설치하시겠습니까?" true; then
        log_error "Azure CLI가 필요합니다. 설치를 취소합니다."
        exit 1
    fi
    
    log_info "Azure CLI 설치 중..."
    
    # OS 감지
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Debian/Ubuntu
        if [ -f /etc/debian_version ]; then
            curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
        # RedHat/CentOS
        elif [ -f /etc/redhat-release ]; then
            sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
            sudo sh -c 'echo -e "[azure-cli]\nname=Azure CLI\nbaseurl=https://packages.microsoft.com/yumrepos/azure-cli\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/azure-cli.repo'
            sudo yum install -y azure-cli
        else
            log_error "지원하지 않는 Linux 배포판입니다."
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - Homebrew 사용
        if command -v brew &> /dev/null; then
            brew update && brew install azure-cli
        else
            log_error "Homebrew가 설치되어 있지 않습니다. https://brew.sh 에서 설치해주세요."
            exit 1
        fi
    else
        log_error "지원하지 않는 운영체제입니다."
        log_info "수동 설치: https://learn.microsoft.com/cli/azure/install-azure-cli"
        exit 1
    fi
    
    if command -v az &> /dev/null; then
        log_success "Azure CLI 설치 완료!"
        az version
    else
        log_error "Azure CLI 설치에 실패했습니다."
        exit 1
    fi
}

# Azure 로그인
azure_login() {
    log_header "${KEY} Azure 로그인"
    
    # 이미 로그인되어 있는지 확인
    if az account show &> /dev/null; then
        CURRENT_ACCOUNT=$(az account show --query "{Name:name, ID:id}" -o json)
        log_success "이미 Azure에 로그인되어 있습니다."
        echo ""
        echo -e "${CYAN}현재 계정:${NC}"
        echo "$CURRENT_ACCOUNT" | jq -r '. | "  이름: \(.Name)\n  구독 ID: \(.ID)"'
        echo ""
        
        if ! prompt_confirm "다른 계정으로 로그인하시겠습니까?" false; then
            return 0
        fi
    fi
    
    log_info "브라우저가 열립니다. Azure 계정으로 로그인해주세요."
    echo ""
    
    # --use-device-code 제거하여 새로운 대화형 로그인 사용
    # Azure CLI 2.30.0 이상은 자동으로 구독 선택 UI 제공
    if az login --only-show-errors; then
        log_success "Azure 로그인 성공!"
    else
        log_error "Azure 로그인에 실패했습니다."
        exit 1
    fi
}

# 구독 선택 (Azure CLI의 대화형 선택 사용)
select_subscription() {
    log_header "${GEAR} Azure 구독 확인"
    
    # 현재 선택된 구독 정보 가져오기
    SUBSCRIPTION_ID=$(az account show --query id -o tsv)
    SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
    SUBSCRIPTION_COUNT=$(az account list --query "length([])" -o tsv)
    
    echo ""
    log_info "현재 선택된 구독:"
    echo -e "${GREEN}  이름: ${SUBSCRIPTION_NAME}${NC}"
    echo -e "${GREEN}  ID: ${SUBSCRIPTION_ID}${NC}"
    echo ""
    
    # 여러 구독이 있으면 변경 옵션 제공
    if [ "$SUBSCRIPTION_COUNT" -gt 1 ]; then
        if prompt_confirm "다른 구독을 사용하시겠습니까?" false; then
            echo ""
            echo -e "${CYAN}사용 가능한 구독 목록:${NC}"
            az account list --query "[].{번호:name, 구독ID:id}" -o table
            echo ""
            
            prompt_input "사용할 구독 ID를 입력하세요" "$SUBSCRIPTION_ID" NEW_SUBSCRIPTION_ID
            
            if az account set --subscription "$NEW_SUBSCRIPTION_ID" 2>/dev/null; then
                SUBSCRIPTION_ID=$(az account show --query id -o tsv)
                SUBSCRIPTION_NAME=$(az account show --query name -o tsv)
                log_success "구독 변경 완료: ${SUBSCRIPTION_NAME}"
            else
                log_error "유효하지 않은 구독 ID입니다."
                exit 1
            fi
        else
            log_success "현재 구독을 사용합니다: ${SUBSCRIPTION_NAME}"
        fi
    else
        log_success "구독이 1개만 있어서 자동으로 선택됩니다: ${SUBSCRIPTION_NAME}"
    fi
    
    export SUBSCRIPTION_ID
    export SUBSCRIPTION_NAME
}

# GitHub 저장소 정보 가져오기
get_github_info() {
    log_header "${INFO} GitHub 저장소 정보"
    
    # GitHub CLI로 저장소 정보 가져오기
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        REPO_FULL=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "")
        
        if [ -n "$REPO_FULL" ]; then
            REPO_OWNER=$(echo "$REPO_FULL" | cut -d'/' -f1)
            REPO_NAME=$(echo "$REPO_FULL" | cut -d'/' -f2)
            log_success "GitHub 저장소 자동 감지: ${REPO_FULL}"
        fi
    fi
    
    # Git remote에서 추출 시도
    if [ -z "$REPO_FULL" ]; then
        GIT_REMOTE=$(git remote get-url origin 2>/dev/null || echo "")
        if [[ "$GIT_REMOTE" =~ github.com[:/]([^/]+)/([^/.]+) ]]; then
            REPO_OWNER="${BASH_REMATCH[1]}"
            REPO_NAME="${BASH_REMATCH[2]}"
            REPO_FULL="${REPO_OWNER}/${REPO_NAME}"
            log_success "Git remote에서 저장소 정보 추출: ${REPO_FULL}"
        fi
    fi
    
    # 수동 입력
    if [ -z "$REPO_OWNER" ]; then
        prompt_input "GitHub 사용자명/조직명" "" REPO_OWNER
    fi
    
    if [ -z "$REPO_NAME" ]; then
        prompt_input "GitHub 저장소 이름" "affinity-app" REPO_NAME
    fi
    
    REPO_FULL="${REPO_OWNER}/${REPO_NAME}"
    
    echo ""
    log_info "GitHub 저장소: ${REPO_FULL}"
    
    export REPO_OWNER
    export REPO_NAME
    export REPO_FULL
}

# 리소스 설정
configure_resources() {
    log_header "${GEAR} Azure 리소스 설정"
    
    # 프로젝트 이름
    prompt_input "프로젝트 이름 (영문, 숫자, 하이픈만 가능)" "affinity-app" PROJECT_NAME
    
    # 리소스 그룹 이름 자동 생성
    TIMESTAMP=$(date +%Y%m%d)
    RANDOM_SUFFIX=$(openssl rand -hex 2)
    DEFAULT_RG="${PROJECT_NAME}-rg-${TIMESTAMP}-${RANDOM_SUFFIX}"
    
    prompt_input "리소스 그룹 이름" "$DEFAULT_RG" RESOURCE_GROUP
    
    # 지역 선택
    echo ""
    log_info "주요 Azure 지역:"
    echo "  1) koreacentral (한국 중부)"
    echo "  2) koreasouth (한국 남부)"
    echo "  3) japaneast (일본 동부)"
    echo "  4) southeastasia (동남아시아)"
    echo "  5) eastus (미국 동부)"
    echo ""
    echo -e "${YELLOW}💡 숫자 또는 지역 이름을 입력하세요${NC}"
    echo ""
    
    prompt_input "Azure 지역 (숫자 또는 이름)" "1" LOCATION_INPUT
    
    # 숫자를 지역 이름으로 변환
    case "$LOCATION_INPUT" in
        1|koreacentral)
            LOCATION="koreacentral"
            ;;
        2|koreasouth)
            LOCATION="koreasouth"
            ;;
        3|japaneast)
            LOCATION="japaneast"
            ;;
        4|southeastasia)
            LOCATION="southeastasia"
            ;;
        5|eastus)
            LOCATION="eastus"
            ;;
        *)
            # 직접 입력한 경우 그대로 사용
            LOCATION="$LOCATION_INPUT"
            ;;
    esac
    
    log_success "선택된 지역: ${LOCATION}"
    
    # Container App 이름
    DEFAULT_APP_NAME="${PROJECT_NAME}"
    prompt_input "Container App 이름" "$DEFAULT_APP_NAME" CONTAINER_APP_NAME
    
    # Container Apps 환경 이름
    DEFAULT_ENV_NAME="${PROJECT_NAME}-env"
    prompt_input "Container Apps 환경 이름" "$DEFAULT_ENV_NAME" CONTAINER_APP_ENV
    
    # Docker 이미지
    DEFAULT_IMAGE="ghcr.io/${REPO_OWNER}/${REPO_NAME}:latest"
    prompt_input "Docker 이미지" "$DEFAULT_IMAGE" CONTAINER_IMAGE
    
    export PROJECT_NAME
    export RESOURCE_GROUP
    export LOCATION
    export CONTAINER_APP_NAME
    export CONTAINER_APP_ENV
    export CONTAINER_IMAGE
    
    echo ""
    log_success "리소스 설정 완료!"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}📋 설정 요약${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${YELLOW}프로젝트:${NC} ${PROJECT_NAME}"
    echo -e "  ${YELLOW}리소스 그룹:${NC} ${RESOURCE_GROUP}"
    echo -e "  ${YELLOW}지역:${NC} ${LOCATION}"
    echo -e "  ${YELLOW}Container App:${NC} ${CONTAINER_APP_NAME}"
    echo -e "  ${YELLOW}환경:${NC} ${CONTAINER_APP_ENV}"
    echo -e "  ${YELLOW}이미지:${NC} ${CONTAINER_IMAGE}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# 리소스 그룹 생성
create_resource_group() {
    log_header "${ROCKET} 리소스 그룹 생성"
    
    # 이미 존재하는지 확인
    if az group exists --name "$RESOURCE_GROUP" 2>/dev/null | grep -q "true"; then
        log_warn "리소스 그룹 '${RESOURCE_GROUP}'이(가) 이미 존재합니다."
        
        if ! prompt_confirm "기존 리소스 그룹을 사용하시겠습니까?" true; then
            log_error "리소스 그룹 설정을 다시 해주세요."
            exit 1
        fi
        
        log_success "기존 리소스 그룹 사용: ${RESOURCE_GROUP}"
        return 0
    fi
    
    log_info "리소스 그룹 생성 중: ${RESOURCE_GROUP}"
    
    if az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none; then
        log_success "리소스 그룹 생성 완료: ${RESOURCE_GROUP}"
    else
        log_error "리소스 그룹 생성 실패"
        exit 1
    fi
}

# Azure AD 앱 및 서비스 주체 생성
create_service_principal() {
    log_header "${KEY} 서비스 주체 생성"
    
    APP_NAME="${PROJECT_NAME}-deployer"
    
    log_info "Azure AD App 생성 중: ${APP_NAME}"
    
    # 기존 앱 확인
    EXISTING_APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv 2>/dev/null)
    
    if [ -n "$EXISTING_APP_ID" ]; then
        log_warn "동일한 이름의 앱이 이미 존재합니다: ${APP_NAME}"
        echo -e "${CYAN}기존 앱 ID: ${EXISTING_APP_ID}${NC}"
        echo ""
        
        if prompt_confirm "기존 앱을 삭제하고 새로 만드시겠습니까?" false; then
            log_info "기존 앱 삭제 중..."
            
            # Federated credentials 먼저 삭제
            CRED_IDS=$(az ad app federated-credential list --id "$EXISTING_APP_ID" --query "[].id" -o tsv 2>/dev/null)
            if [ -n "$CRED_IDS" ]; then
                while IFS= read -r cred_id; do
                    az ad app federated-credential delete --id "$EXISTING_APP_ID" --federated-credential-id "$cred_id" 2>/dev/null
                done <<< "$CRED_IDS"
            fi
            
            # Service Principal 삭제
            az ad sp delete --id "$EXISTING_APP_ID" 2>/dev/null || true
            
            # App 삭제
            az ad app delete --id "$EXISTING_APP_ID" 2>/dev/null
            
            log_success "기존 앱 삭제 완료"
            sleep 2  # 삭제 반영 대기
            
            # 새 앱 생성
            APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
            log_success "새 Azure AD App 생성 완료: ${APP_ID}"
        else
            # 기존 앱 사용
            APP_ID="$EXISTING_APP_ID"
            log_success "기존 앱 사용: ${APP_ID}"
        fi
    else
        APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
        log_success "Azure AD App 생성 완료: ${APP_ID}"
    fi
    
    # 서비스 주체 생성
    log_info "서비스 주체 생성 중..."
    
    SP_EXISTS=$(az ad sp show --id "$APP_ID" --query appId -o tsv 2>/dev/null || echo "")
    
    if [ -z "$SP_EXISTS" ]; then
        az ad sp create --id "$APP_ID" --output none
        log_success "서비스 주체 생성 완료"
    else
        log_success "서비스 주체가 이미 존재합니다"
    fi
    
    # Contributor 역할 부여
    log_info "Contributor 역할 부여 중..."
    
    # 기존 역할 할당 확인
    ROLE_EXISTS=$(az role assignment list \
        --assignee "$APP_ID" \
        --role Contributor \
        --scope "/subscriptions/$SUBSCRIPTION_ID" \
        --query "[0].id" -o tsv 2>/dev/null || echo "")
    
    if [ -z "$ROLE_EXISTS" ]; then
        # 역할 할당이 즉시 반영되지 않을 수 있어서 재시도
        for i in {1..5}; do
            if az role assignment create \
                --assignee "$APP_ID" \
                --role Contributor \
                --scope "/subscriptions/$SUBSCRIPTION_ID" \
                --output none 2>/dev/null; then
                log_success "Contributor 역할 부여 완료"
                break
            else
                if [ $i -lt 5 ]; then
                    log_warn "재시도 중... ($i/5)"
                    sleep 3
                else
                    log_error "역할 부여 실패. 수동으로 Azure Portal에서 설정해주세요."
                    exit 1
                fi
            fi
        done
    else
        log_success "Contributor 역할이 이미 부여되어 있습니다"
    fi
    
    # Federated Credential 생성
    log_info "Federated Credential 생성 중..."
    
    CREDENTIAL_NAME="github-${REPO_NAME}-main"
    SUBJECT="repo:${REPO_FULL}:ref:refs/heads/main"
    
    # 기존 credential 삭제 (있으면)
    CRED_EXISTS=$(az ad app federated-credential list --id "$APP_ID" \
        --query "[?name=='$CREDENTIAL_NAME'].id" -o tsv 2>/dev/null || echo "")
    
    if [ -n "$CRED_EXISTS" ]; then
        log_info "기존 Federated Credential 삭제 중..."
        az ad app federated-credential delete --id "$APP_ID" --federated-credential-id "$CRED_EXISTS" 2>/dev/null
    fi
    
    # 새 credential 생성
    az ad app federated-credential create \
        --id "$APP_ID" \
        --parameters "{
            \"name\": \"$CREDENTIAL_NAME\",
            \"issuer\": \"https://token.actions.githubusercontent.com\",
            \"subject\": \"$SUBJECT\",
            \"description\": \"GitHub Actions for ${REPO_FULL} main branch\",
            \"audiences\": [\"api://AzureADTokenExchange\"]
        }" --output none
    
    log_success "Federated Credential 생성 완료"
    
    # Tenant ID 가져오기
    TENANT_ID=$(az account show --query tenantId -o tsv)
    
    export APP_ID
    export TENANT_ID
    export APP_NAME
}

# GitHub Secrets 설정 가이드
show_github_secrets() {
    log_header "${CELEBRATE} GitHub Secrets 설정"
    
    echo ""
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}다음 값들을 GitHub Secrets에 저장하세요!${NC}"
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret${NC}"
    echo ""
    
    cat << EOF
┌────────────────────────────────────────────────────────────────┐
│ Secret Name                │ Value                             │
├────────────────────────────────────────────────────────────────┤
│ AZURE_CLIENT_ID            │ ${APP_ID}
│ AZURE_TENANT_ID            │ ${TENANT_ID}
│ AZURE_SUBSCRIPTION_ID      │ ${SUBSCRIPTION_ID}
│ AZURE_RESOURCE_GROUP       │ ${RESOURCE_GROUP}
│ AZURE_CONTAINER_APP_NAME   │ ${CONTAINER_APP_NAME}
│ AZURE_CONTAINER_APP_ENV    │ ${CONTAINER_APP_ENV}
│ AZURE_LOCATION             │ ${LOCATION}
└────────────────────────────────────────────────────────────────┘
EOF
    
    echo ""
    
    # 설정 파일로 저장
    CONFIG_FILE=".azure-cicd-config"
    cat > "$CONFIG_FILE" << EOF
# Azure CI/CD 설정 정보
# 생성 날짜: $(date)

# GitHub 저장소
REPO_OWNER="${REPO_OWNER}"
REPO_NAME="${REPO_NAME}"
REPO_FULL="${REPO_FULL}"

# Azure 구독
SUBSCRIPTION_ID="${SUBSCRIPTION_ID}"
SUBSCRIPTION_NAME="${SUBSCRIPTION_NAME}"
TENANT_ID="${TENANT_ID}"

# Azure 리소스
RESOURCE_GROUP="${RESOURCE_GROUP}"
LOCATION="${LOCATION}"
PROJECT_NAME="${PROJECT_NAME}"

# Container Apps
CONTAINER_APP_NAME="${CONTAINER_APP_NAME}"
CONTAINER_APP_ENV="${CONTAINER_APP_ENV}"
CONTAINER_IMAGE="${CONTAINER_IMAGE}"

# Service Principal
APP_ID="${APP_ID}"
APP_NAME="${APP_NAME}"

# GitHub Secrets (복사해서 사용)
# AZURE_CLIENT_ID: ${APP_ID}
# AZURE_TENANT_ID: ${TENANT_ID}
# AZURE_SUBSCRIPTION_ID: ${SUBSCRIPTION_ID}
# AZURE_RESOURCE_GROUP: ${RESOURCE_GROUP}
# AZURE_CONTAINER_APP_NAME: ${CONTAINER_APP_NAME}
# AZURE_CONTAINER_APP_ENV: ${CONTAINER_APP_ENV}
# AZURE_LOCATION: ${LOCATION}
EOF
    
    log_success "설정 정보가 ${CONFIG_FILE} 파일에 저장되었습니다."
    echo ""
    
    # GitHub CLI로 자동 설정 제안
    if command -v gh &> /dev/null && gh auth status &> /dev/null; then
        echo ""
        if prompt_confirm "GitHub CLI를 사용하여 자동으로 Secrets를 설정하시겠습니까?" true; then
            set_github_secrets_automatically
        else
            log_info "수동으로 GitHub Secrets를 설정해주세요."
        fi
    else
        log_warn "GitHub CLI가 로그인되어 있지 않습니다. 수동으로 Secrets를 설정해주세요."
    fi
}

# GitHub Secrets 자동 설정 (GitHub CLI 사용)
set_github_secrets_automatically() {
    log_info "GitHub Secrets 자동 설정 중..."
    
    gh secret set AZURE_CLIENT_ID --body "$APP_ID" --repo "$REPO_FULL" && \
    gh secret set AZURE_TENANT_ID --body "$TENANT_ID" --repo "$REPO_FULL" && \
    gh secret set AZURE_SUBSCRIPTION_ID --body "$SUBSCRIPTION_ID" --repo "$REPO_FULL" && \
    gh secret set AZURE_RESOURCE_GROUP --body "$RESOURCE_GROUP" --repo "$REPO_FULL" && \
    gh secret set AZURE_CONTAINER_APP_NAME --body "$CONTAINER_APP_NAME" --repo "$REPO_FULL" && \
    gh secret set AZURE_CONTAINER_APP_ENV --body "$CONTAINER_APP_ENV" --repo "$REPO_FULL" && \
    gh secret set AZURE_LOCATION --body "$LOCATION" --repo "$REPO_FULL"
    
    if [ $? -eq 0 ]; then
        log_success "GitHub Secrets 자동 설정 완료!"
        echo ""
        log_info "확인: https://github.com/${REPO_FULL}/settings/secrets/actions"
    else
        log_error "GitHub Secrets 자동 설정 실패. 수동으로 설정해주세요."
    fi
}

# 최종 안내
show_final_instructions() {
    log_header "${CELEBRATE} 설정 완료!"
    
    echo ""
    echo -e "${BOLD}${GREEN}축하합니다! CI/CD 파이프라인 설정이 완료되었습니다!${NC}"
    echo ""
    
    # 초기 배포 여부 확인
    if prompt_confirm "지금 바로 Azure에 첫 배포를 진행하시겠습니까?" false; then
        echo ""
        log_info "첫 배포를 시작합니다..."
        
        # git 상태 확인
        if git diff --quiet && git diff --cached --quiet; then
            log_info "변경사항이 없어서 더미 커밋을 생성합니다."
            echo "# CI/CD Setup Complete - $(date)" >> .cicd-setup-timestamp
            git add .cicd-setup-timestamp
        else
            git add .
        fi
        
        git commit -m "chore: setup Azure CI/CD pipeline" --no-verify 2>/dev/null || true
        
        log_info "GitHub에 푸시하여 배포를 트리거합니다..."
        if git push origin main; then
            echo ""
            log_success "푸시 완료! GitHub Actions가 자동으로 배포를 시작합니다."
            echo ""
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${YELLOW}📊 배포 진행 상황 확인:${NC}"
            echo "   https://github.com/${REPO_FULL}/actions"
            echo ""
            echo -e "${YELLOW}⏱️ 예상 소요 시간: 5-10분${NC}"
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo ""
        else
            log_error "푸시 실패. 수동으로 푸시해주세요: git push origin main"
        fi
    else
        log_info "배포를 건너뜁니다. 나중에 코드를 푸시하면 자동 배포됩니다."
    fi
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}📚 다음 단계 (앱 수정 및 배포)${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}1️⃣ GitHub Secrets 확인${NC}"
    echo "   https://github.com/${REPO_FULL}/settings/secrets/actions"
    echo ""
    echo -e "${YELLOW}2️⃣ 코드 수정 후 자동 배포${NC}"
    echo -e "   ${GREEN}좌측 채팅창에서 GitHub Copilot에게:${NC}"
    echo ""
    echo -e "   ${BLUE}\"코드 수정했어. git add, commit, push 해줘\"${NC}"
    echo ""
    echo -e "   ${GREEN}또는 직접 터미널에서:${NC}"
    echo -e "   ${BLUE}git add .${NC}"
    echo -e "   ${BLUE}git commit -m \"feat: 새 기능 추가\"${NC}"
    echo -e "   ${BLUE}git push origin main${NC}"
    echo ""
    echo -e "${YELLOW}3️⃣ GitHub Actions에서 배포 확인${NC}"
    echo "   https://github.com/${REPO_FULL}/actions"
    echo ""
    echo -e "${YELLOW}4️⃣ 배포된 앱 URL 확인${NC}"
    echo "   Actions 워크플로우 Summary에서 자동 표시됨"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${GREEN}💡 팁: 이제부터는 ${BOLD}git push만 하면 자동으로 Azure에 배포${NC}${GREEN}됩니다!${NC}"
    echo ""
}

# 메인 실행
main() {
    clear
    echo ""
    echo -e "${BOLD}${MAGENTA}"
    cat << "EOF"
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║        Azure CI/CD 자동 설정 스크립트                     ║
    ║        Affinity Diagram App                               ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
    log_info "이 스크립트는 GitHub Actions를 통한 Azure Container Apps 자동 배포를 설정합니다."
    echo ""
    
    if ! prompt_confirm "설정을 시작하시겠습니까?" true; then
        log_info "설정을 취소했습니다."
        exit 0
    fi
    
    # 단계별 실행
    check_and_install_azure_cli
    azure_login
    select_subscription
    get_github_info
    configure_resources
    create_resource_group
    create_service_principal
    show_github_secrets
    show_final_instructions
    
    echo ""
    log_success "모든 설정이 완료되었습니다! 🎉"
    echo ""
}

# 스크립트 시작
main "$@"
