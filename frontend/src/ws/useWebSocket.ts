import { useEffect, useRef } from 'react';

/**
 * 환경별 API/WebSocket URL 자동 감지
 * - 로컬: localhost:8000
 * - GitHub Codespaces: xxx-8000.app.github.dev
 * - Azure Container Apps: 같은 도메인 사용
 */
function getApiBaseUrl(): string {
  // 1. 환경변수 우선 (명시적 설정)
  const envBase = import.meta.env.VITE_API_BASE_URL;
  if (envBase) return envBase;

  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const loc = window.location;
  
  // 2. GitHub Codespaces 환경
  if (loc.hostname.includes('.app.github.dev')) {
    // URL 형식: https://xxx-5173.app.github.dev → https://xxx-8000.app.github.dev
    const backendHost = loc.hostname.replace(/-\d+\.app\.github\.dev$/, '-8000.app.github.dev');
    return `${loc.protocol}//${backendHost}`;
  }
  
  // 3. Azure Container Apps / Production 환경
  // 백엔드와 프론트엔드가 같은 컨테이너에서 실행되거나 같은 도메인을 사용
  if (loc.hostname.includes('.azurecontainerapps.io') || 
      loc.hostname.includes('.azurewebsites.net') ||
      (loc.protocol === 'https:' && !loc.hostname.includes('localhost'))) {
    // 프로덕션에서는 같은 호스트 사용
    return `${loc.protocol}//${loc.hostname}${loc.port ? ':' + loc.port : ''}`;
  }
  
  // 4. 로컬 개발 환경
  const apiPort = (loc.port === '5173' || loc.port === '3000') ? '8000' : loc.port;
  return `${loc.protocol}//${loc.hostname}:${apiPort}`;
}

export function useWebSocket(path: string, onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3초

  useEffect(() => {
    const isDev = import.meta.env.DEV;
    let base = getApiBaseUrl();
    
    // WebSocket URL로 변환
    const httpUrl = base.replace(/\/$/, '') + path;
    const wsUrl = httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    
    const connect = () => {
      try {
        if (isDev) console.info('[WS] Connecting to:', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttemptsRef.current = 0; // 재연결 카운터 리셋
          if (isDev) console.info('[WS] Connected:', wsUrl);
        };

        ws.onclose = (e) => {
          if (isDev) console.info('[WS] Closed:', e.code, e.reason);
          
          // 자동 재연결 (개발 모드에서만, 최대 시도 횟수 제한)
          if (isDev && reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current++;
            console.info(`[WS] Reconnecting... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
          }
        };

        ws.onerror = (e) => {
          console.error('[WS] Error:', e);
          // GitHub Codespaces에서 포트가 private일 수 있으므로 안내
          if (base.includes('.app.github.dev')) {
            console.warn('[WS] GitHub Codespaces 사용 중: 포트 8000이 "Public"으로 설정되어 있는지 확인하세요.');
          }
        };

        ws.onmessage = (ev) => {
          try {
            onMessage(JSON.parse(ev.data));
          } catch (err) {
            if (isDev) console.warn('[WS] Parse error:', err);
          }
        };
      } catch (err) {
        console.error('[WS] Connection failed:', err);
      }
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [path, onMessage]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('[WS] Cannot send, connection not open:', wsRef.current?.readyState);
    }
  };

  return { send };
}
