#!/usr/bin/env python3
"""
GitHub Codespaces에서 포트를 Public으로 설정하는 스크립트
"""
import os
import sys
import json
import subprocess
from pathlib import Path

def set_port_public(port: int = 8000) -> bool:
    """포트를 Public으로 설정"""
    
    # Codespaces 환경인지 확인
    codespace_name = os.getenv("CODESPACE_NAME")
    if not codespace_name:
        print("❌ GitHub Codespaces 환경이 아닙니다.")
        return False
    
    print(f"✅ GitHub Codespaces 환경 감지: {codespace_name}")
    print(f"🔧 포트 {port}를 Public으로 설정 시도 중...")
    
    # 방법 1: gh CLI 사용
    try:
        result = subprocess.run(
            ["gh", "codespace", "ports", "visibility", f"{port}:public", "-c", codespace_name],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print(f"✅ 포트 {port}가 Public으로 설정되었습니다! (gh CLI)")
            return True
        else:
            print(f"⚠️  gh CLI 설정 실패: {result.stderr}")
    except FileNotFoundError:
        print("⚠️  gh CLI가 설치되어 있지 않습니다.")
    except subprocess.TimeoutExpired:
        print("⚠️  gh CLI 타임아웃")
    except Exception as e:
        print(f"⚠️  gh CLI 오류: {e}")
    
    # 방법 2: VS Code 설정 파일 수정 시도
    try:
        workspace_dir = Path("/workspaces/affinity-app")
        vscode_dir = workspace_dir / ".vscode"
        settings_file = vscode_dir / "settings.json"
        
        vscode_dir.mkdir(exist_ok=True)
        
        # 기존 설정 읽기
        settings = {}
        if settings_file.exists():
            with open(settings_file, 'r') as f:
                try:
                    settings = json.load(f)
                except json.JSONDecodeError:
                    settings = {}
        
        # 포트 설정 추가
        if "remote.portsAttributes" not in settings:
            settings["remote.portsAttributes"] = {}
        
        settings["remote.portsAttributes"][str(port)] = {
            "label": "Backend API",
            "onAutoForward": "notify",
            "visibility": "public"
        }
        
        # 설정 저장
        with open(settings_file, 'w') as f:
            json.dump(settings, f, indent=2)
        
        print(f"✅ .vscode/settings.json에 포트 {port} 설정 추가됨")
        print("⚠️  이 설정은 다음 포트 포워딩 시 적용됩니다.")
        return True
        
    except Exception as e:
        print(f"⚠️  설정 파일 수정 실패: {e}")
    
    # 실패
    print("\n" + "="*60)
    print("⚠️  자동 설정에 실패했습니다.")
    print("\n📝 수동 설정 방법:")
    print("   1. VS Code 하단의 'PORTS' 탭 클릭")
    print(f"   2. 포트 {port} 찾기")
    print("   3. 'Visibility' 열에서 우클릭")
    print("   4. 'Port Visibility' → 'Public' 선택")
    print("="*60)
    return False

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    success = set_port_public(port)
    sys.exit(0 if success else 1)
