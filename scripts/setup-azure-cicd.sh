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
LOCK="🔒"

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

# 비밀 입력 받기 (화면에 표시 안됨)
prompt_secret() {
    local prompt_text=$1
    local result_var=$2
    
    echo -e -n "${CYAN}${prompt_text}${NC}: "
    read -s user_input
    echo
    
    eval $result_var="'$user_input'"
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
        echo "$CURRENT_ACCOUNT" | jq -r '. | "  이름: \(.Name)\n  구독 ID: \(.ID)"' 2>/dev/null || \
            echo "$CURRENT_ACCOUNT"
        echo ""
        
        if ! prompt_confirm "다른 계정으로 로그인하시겠습니까?" false; then
            return 0
        fi
    fi
    
    log_info "브라우저가 열립니다. Azure 계정으로 로그인해주세요."
    echo ""
    
    if az login --only-show-errors; then
        log_success "Azure 로그인 성공!"
    else
        log_error "Azure 로그인에 실패했습니다."
        exit 1
    fi
}

# 구독 선택
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
    RANDOM_SUFFIX=$(openssl rand -hex 2 2>/dev/null || echo "$(date +%s | tail -c 5)")
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
    
    # Federated Credentials 생성 (여러 개)
    log_info "Federated Credentials 생성 중..."
    
    # 1. Main 브랜치용 Credential
    CREDENTIAL_NAME_MAIN="github-${REPO_NAME}-main"
    SUBJECT_MAIN="repo:${REPO_FULL}:ref:refs/heads/main"
    
    # 2. Production Environment용 Credential
    CREDENTIAL_NAME_PROD="github-${REPO_NAME}-prod-env"
    SUBJECT_PROD="repo:${REPO_FULL}:environment:production"
    
    # 3. Staging Environment용 Credential (선택사항)
    CREDENTIAL_NAME_STAGING="github-${REPO_NAME}-staging-env"
    SUBJECT_STAGING="repo:${REPO_FULL}:environment:staging"
    
    # 기존 credentials 확인 및 생성
    create_federated_credential() {
        local cred_name=$1
        local subject=$2
        local description=$3
        
        # 기존 credential 확인
        CRED_EXISTS=$(az ad app federated-credential list --id "$APP_ID" \
            --query "[?name=='$cred_name'].id" -o tsv 2>/dev/null || echo "")
        
        if [ -n "$CRED_EXISTS" ]; then
            log_info "기존 '$cred_name' Credential 삭제 중..."
            az ad app federated-credential delete --id "$APP_ID" --federated-credential-id "$CRED_EXISTS" 2>/dev/null
        fi
        
        # 새 credential 생성
        log_info "생성 중: $cred_name (subject: $subject)"
        az ad app federated-credential create \
            --id "$APP_ID" \
            --parameters "{
                \"name\": \"$cred_name\",
                \"issuer\": \"https://token.actions.githubusercontent.com\",
                \"subject\": \"$subject\",
                \"description\": \"$description\",
                \"audiences\": [\"api://AzureADTokenExchange\"]
            }" --output none
    }
    
    # 각 Credential 생성
    create_federated_credential "$CREDENTIAL_NAME_MAIN" "$SUBJECT_MAIN" "GitHub Actions for ${REPO_FULL} main branch"
    create_federated_credential "$CREDENTIAL_NAME_PROD" "$SUBJECT_PROD" "GitHub Actions for ${REPO_FULL} production environment"
    create_federated_credential "$CREDENTIAL_NAME_STAGING" "$SUBJECT_STAGING" "GitHub Actions for ${REPO_FULL} staging environment"
    
    log_success "모든 Federated Credentials 생성 완료 (main, production, staging)"
    
    # Tenant ID 가져오기
    TENANT_ID=$(az account show --query tenantId -o tsv)
    
    export APP_ID
    export TENANT_ID
    export APP_NAME
}

# GitHub Personal Access Token 테스트
test_github_token() {
    local token=$1
    
    log_info "토큰 검증 중..."
    
    # GitHub API로 토큰 테스트
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: token $token" \
        https://api.github.com/user)
    
    if [ "$response" -eq 200 ]; then
        # 사용자 정보 가져오기
        local user_info=$(curl -s -H "Authorization: token $token" https://api.github.com/user)
        local username=$(echo "$user_info" | jq -r '.login' 2>/dev/null || echo "Unknown")
        
        log_success "토큰 검증 성공! GitHub 사용자: $username"
        
        # 권한 확인
        local scopes=$(curl -s -I -H "Authorization: token $token" https://api.github.com/user 2>/dev/null | grep -i x-oauth-scopes | cut -d' ' -f2-)
        if [ -n "$scopes" ]; then
            echo -e "${GREEN}${CHECK} 토큰 권한: $scopes${NC}"
        fi
        
        return 0
    else
        log_error "토큰 검증 실패 (HTTP $response)"
        return 1
    fi
}

# GitHub Device Flow 인증
setup_with_device_flow() {
    log_info "GitHub CLI를 통한 Device Flow 인증을 시작합니다..."
    echo ""
    
    # gh CLI 설치 확인
    if ! command -v gh &> /dev/null; then
        log_warn "GitHub CLI가 설치되어 있지 않습니다."
        return 1
    fi
    
    # gh auth login with device flow
    gh auth login --web --scopes "repo,workflow"
    
    if [ $? -eq 0 ]; then
        log_success "GitHub CLI 인증 완료"
        
        # 토큰 추출
        GITHUB_PAT=$(gh auth token 2>/dev/null)
        
        if [ -n "$GITHUB_PAT" ]; then
            log_success "토큰 획득 성공"
            export GITHUB_PAT
            return 0
        else
            log_error "토큰 획득 실패"
            return 1
        fi
    else
        log_error "인증 실패"
        return 1
    fi
}

# 수동 토큰 입력
manual_token_input() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${YELLOW}GitHub Personal Access Token 생성 가이드${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    echo -e "${GREEN}Step 1: 새 브라우저 탭에서 GitHub 설정 페이지를 엽니다${NC}"
    echo -e "        아래 URL을 Ctrl+Click하여 열기:"
    echo -e "${BLUE}        https://github.com/settings/tokens/new${NC}"
    echo ""
    
    echo -e "${GREEN}Step 2: 토큰 설정${NC}"
    echo "   • Note: ${YELLOW}Affinity App CI/CD${NC}"
    echo "   • Expiration: ${YELLOW}90 days${NC}"
    echo ""
    
    echo -e "${GREEN}Step 3: 권한 선택 (Select scopes)${NC}"
    echo "   ${YELLOW}☑ repo${NC} (전체 private repos 접근)"
    echo "     ☑ repo:status"
    echo "     ☑ repo_deployment"
    echo "     ☑ public_repo"
    echo "     ☑ repo:invite"
    echo "     ☑ security_events"
    echo "   ${YELLOW}☑ workflow${NC} (GitHub Actions 워크플로우 수정)"
    echo ""
    
    echo -e "${GREEN}Step 4: 페이지 하단의 'Generate token' 클릭${NC}"
    echo ""
    
    echo -e "${GREEN}Step 5: 생성된 토큰 복사 (ghp_로 시작)${NC}"
    echo -e "${RED}        ⚠️  이 토큰은 다시 볼 수 없으니 반드시 복사하세요!${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    # 브라우저 열기 옵션
    if prompt_confirm "브라우저에서 GitHub Token 페이지를 열까요?" true; then
        if [ -n "$BROWSER" ]; then
            "$BROWSER" "https://github.com/settings/tokens/new" 2>/dev/null &
        elif command -v xdg-open &> /dev/null; then
            xdg-open "https://github.com/settings/tokens/new" 2>/dev/null &
        elif command -v open &> /dev/null; then
            open "https://github.com/settings/tokens/new" 2>/dev/null &
        else
            log_warn "브라우저를 자동으로 열 수 없습니다. 위 URL을 직접 방문해주세요."
        fi
    fi
    
    echo ""
    echo -e "${CYAN}생성된 토큰을 입력하세요 (ghp_...):${NC}"
    echo -e "${YELLOW}⚠️  입력 시 화면에 표시됩니다. 주변을 확인하세요!${NC}"
    echo -n "> "
    
    read GITHUB_PAT
    
    # 입력 후 화면 정리
    clear
    log_header "${LOCK} GitHub Personal Access Token 설정"
    
    if [ -z "$GITHUB_PAT" ]; then
        log_warn "토큰이 입력되지 않았습니다."
        return 1
    fi
    
    # 토큰 형식 확인
    if [[ ! "$GITHUB_PAT" =~ ^ghp_ ]]; then
        log_warn "토큰이 'ghp_'로 시작하지 않습니다. 올바른 형식인지 확인하세요."
    fi
    
    # 토큰 검증
    if test_github_token "$GITHUB_PAT"; then
        export GITHUB_PAT
        return 0
    else
        return 1
    fi
}

# GitHub Personal Access Token 설정
setup_github_pat() {
    log_header "${LOCK} GitHub Personal Access Token 설정"
    
    # 1. 환경 변수로 이미 제공된 경우
    if [ -n "$GITHUB_PAT" ]; then
        log_success "환경 변수에서 GITHUB_PAT를 찾았습니다."
        if test_github_token "$GITHUB_PAT"; then
            return 0
        else
            log_warn "제공된 토큰이 유효하지 않습니다. 새 토큰을 설정합니다."
            unset GITHUB_PAT
        fi
    fi
    
    # 2. 저장된 토큰 확인
    PAT_FILE="${HOME}/.github_pat_affinity"
    if [ -f "$PAT_FILE" ]; then
        STORED_PAT=$(cat "$PAT_FILE" 2>/dev/null)
        if [ -n "$STORED_PAT" ]; then
            log_info "저장된 PAT를 찾았습니다."
            
            # 저장된 토큰 검증
            if test_github_token "$STORED_PAT"; then
                if prompt_confirm "저장된 PAT를 사용하시겠습니까?" true; then
                    GITHUB_PAT="$STORED_PAT"
                    export GITHUB_PAT
                    return 0
                fi
            else
                log_warn "저장된 토큰이 만료되었거나 유효하지 않습니다."
                rm -f "$PAT_FILE"
            fi
        fi
    fi
    
    # 3. 새 토큰 설정
    echo ""
    log_info "GitHub Secrets를 자동으로 설정하려면 Personal Access Token이 필요합니다."
    echo ""
    echo -e "${YELLOW}설정 방법을 선택하세요:${NC}"
    echo "1) GitHub CLI Device Flow 인증 (권장)"
    echo "2) 수동으로 토큰 생성 및 입력"
    echo "3) 건너뛰기 (수동으로 Secret 설정)"
    echo ""
    
    read -p "선택 [1-3]: " method
    
    case $method in
        1)
            if setup_with_device_flow; then
                # 토큰 저장 옵션
                if prompt_confirm "이 PAT를 안전하게 저장하시겠습니까? (다음에 재사용 가능)" true; then
                    echo "$GITHUB_PAT" > "$PAT_FILE"
                    chmod 600 "$PAT_FILE"
                    log_success "PAT가 안전하게 저장되었습니다: $PAT_FILE"
                fi
                return 0
            else
                log_warn "Device Flow 인증 실패. 수동 입력을 시도합니다."
                manual_token_input
            fi
            ;;
        2)
            if manual_token_input; then
                # 토큰 저장 옵션
                if prompt_confirm "이 PAT를 안전하게 저장하시겠습니까? (다음에 재사용 가능)" true; then
                    echo "$GITHUB_PAT" > "$PAT_FILE"
                    chmod 600 "$PAT_FILE"
                    log_success "PAT가 안전하게 저장되었습니다: $PAT_FILE"
                fi
                return 0
            else
                return 1
            fi
            ;;
        3)
            log_warn "PAT 설정을 건너뛰었습니다. GitHub Secrets를 수동으로 설정해야 합니다."
            return 1
            ;;
        *)
            log_error "잘못된 선택입니다."
            return 1
            ;;
    esac
}

# GitHub Secrets 자동 설정 (REST API 사용)
set_github_secrets_with_api() {
    log_info "GitHub Secrets 자동 설정 중 (REST API 사용)..."
    
    # 저장소 공개 키 가져오기
    PUBLIC_KEY_RESPONSE=$(curl -s -H "Authorization: token $GITHUB_PAT" \
        "https://api.github.com/repos/${REPO_FULL}/actions/secrets/public-key")
    
    if echo "$PUBLIC_KEY_RESPONSE" | grep -q "\"key\""; then
        PUBLIC_KEY=$(echo "$PUBLIC_KEY_RESPONSE" | jq -r '.key')
        KEY_ID=$(echo "$PUBLIC_KEY_RESPONSE" | jq -r '.key_id')
        
        log_success "저장소 공개 키 획득 완료"
        
        # Python 스크립트로 암호화 및 설정
        python3 << EOF
import base64
import json
import subprocess
from nacl import encoding, public

def encrypt_secret(public_key: str, secret_value: str) -> str:
    """Encrypt a secret using libsodium."""
    public_key = public.PublicKey(public_key.encode("utf-8"), encoding.Base64Encoder())
    sealed_box = public.SealedBox(public_key)
    encrypted = sealed_box.encrypt(secret_value.encode("utf-8"))
    return base64.b64encode(encrypted).decode("utf-8")

def set_secret(repo, token, secret_name, secret_value, key_id, public_key):
    """Set a GitHub secret using REST API."""
    encrypted_value = encrypt_secret(public_key, secret_value)
    
    url = f"https://api.github.com/repos/{repo}/actions/secrets/{secret_name}"
    
    data = {
        "encrypted_value": encrypted_value,
        "key_id": key_id
    }
    
    cmd = [
        "curl", "-X", "PUT",
        "-H", f"Authorization: token {token}",
        "-H", "Accept: application/vnd.github.v3+json",
        "-d", json.dumps(data),
        url
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return result.returncode == 0

# Secrets to set
secrets = {
    "AZURE_CLIENT_ID": "${APP_ID}",
    "AZURE_TENANT_ID": "${TENANT_ID}",
    "AZURE_SUBSCRIPTION_ID": "${SUBSCRIPTION_ID}",
    "AZURE_RESOURCE_GROUP": "${RESOURCE_GROUP}",
    "AZURE_CONTAINER_APP_NAME": "${CONTAINER_APP_NAME}",
    "AZURE_CONTAINER_APP_ENV": "${CONTAINER_APP_ENV}",
    "AZURE_LOCATION": "${LOCATION}"
}

try:
    import nacl
except ImportError:
    print("Installing PyNaCl...")
    import subprocess
    subprocess.run(["pip3", "install", "pynacl", "--quiet"], check=True)
    import nacl

success_count = 0
for name, value in secrets.items():
    if set_secret("${REPO_FULL}", "${GITHUB_PAT}", name, value, "${KEY_ID}", "${PUBLIC_KEY}"):
        print(f"✅ {name} 설정 완료")
        success_count += 1
    else:
        print(f"❌ {name} 설정 실패")

if success_count == len(secrets):
    print(f"\n✅ 모든 GitHub Secrets 설정 완료! ({success_count}/{len(secrets)})")
else:
    print(f"\n⚠️ 일부 Secrets 설정 실패 ({success_count}/{len(secrets)})")
EOF
        
        if [ $? -eq 0 ]; then
            echo ""
            log_success "GitHub Secrets 자동 설정 완료!"
            echo ""
            log_info "확인: https://github.com/${REPO_FULL}/settings/secrets/actions"
            return 0
        else
            log_error "Secrets 설정 중 일부 오류가 발생했습니다."
            return 1
        fi
    else
        log_error "저장소 공개 키를 가져올 수 없습니다. 권한을 확인해주세요."
        return 1
    fi
}

# GitHub Secrets 설정 (통합)
setup_github_secrets() {
    log_header "${CELEBRATE} GitHub Secrets 설정"
    
    echo ""
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}GitHub Secrets 설정 방법을 선택하세요${NC}"
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "1) 자동 설정 (Personal Access Token 필요)"
    echo "2) 수동 설정 (값만 표시)"
    echo ""
    
    prompt_input "선택 (1 또는 2)" "1" SETUP_METHOD
    
    if [ "$SETUP_METHOD" = "1" ]; then
        # PAT 설정 시도
        if setup_github_pat; then
            # API를 사용한 자동 설정
            if set_github_secrets_with_api; then
                return 0
            else
                log_warn "자동 설정 실패. 수동 설정 가이드를 표시합니다."
            fi
        fi
    fi
    
    # 수동 설정 가이드
    echo ""
    echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}다음 값들을 GitHub Secrets에 수동으로 저장하세요!${NC}"
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
    
    # 설정 파일을 임시로 저장 (Git에는 추가하지 않음)
    # 이 파일은 스크립트 실행 중에만 사용되며, .gitignore에 포함되어 있습니다.
    CONFIG_FILE=".azure-cicd-config"
    log_warn "민감한 정보를 포함한 설정 파일은 Git에 추가되지 않습니다."
    
    cat > "$CONFIG_FILE" << EOF
# Azure CI/CD 설정 정보 (로컬 전용 - Git에 커밋하지 마세요!)
# 생성 날짜: $(date)
# 이 파일은 .gitignore에 포함되어 있습니다.

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

# GitHub Secrets (자동으로 설정됨)
# AZURE_CLIENT_ID: ${APP_ID}
# AZURE_TENANT_ID: ${TENANT_ID}
# AZURE_SUBSCRIPTION_ID: ${SUBSCRIPTION_ID}
# AZURE_RESOURCE_GROUP: ${RESOURCE_GROUP}
# AZURE_CONTAINER_APP_NAME: ${CONTAINER_APP_NAME}
# AZURE_CONTAINER_APP_ENV: ${CONTAINER_APP_ENV}
# AZURE_LOCATION: ${LOCATION}
EOF
    
    log_info "설정 정보가 ${CONFIG_FILE} 파일에 임시 저장되었습니다. (Git에는 추가되지 않음)"
    echo ""
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
    echo -e "${BOLD}${CYAN}📚 다음 단계${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}1️⃣ GitHub Secrets 확인${NC}"
    echo "   https://github.com/${REPO_FULL}/settings/secrets/actions"
    echo ""
    echo -e "${YELLOW}2️⃣ 코드 수정 후 자동 배포${NC}"
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
    ║        Azure CI/CD 자동 설정 스크립트 v2.0               ║
    ║        Affinity Diagram App                               ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    echo ""
    log_info "이 스크립트는 GitHub Actions를 통한 Azure Container Apps 자동 배포를 설정합니다."
    echo -e "${GREEN}✨ 개선사항: GitHub Secrets 자동 설정 기능 추가!${NC}"
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
    setup_github_secrets
    show_final_instructions
    
    echo ""
    log_success "모든 설정이 완료되었습니다! 🎉"
    echo ""
}

# 스크립트 시작
main "$@"