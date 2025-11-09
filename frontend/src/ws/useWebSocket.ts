import { useEffect, useRef, useCallback, useState } from 'react';

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

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<number>();
  const messageQueueRef = useRef<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  // 콜백을 ref에 저장하여 의존성 문제 해결
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
    onCloseRef.current = onClose;
    onErrorRef.current = onError;
  }, [onMessage, onOpen, onClose, onError]);

  const connect = useCallback(() => {
    // 이미 연결되어 있거나 연결 중이면 무시
    if (wsRef.current?.readyState === WebSocket.OPEN || 
        wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('[WS] Already connected or connecting, skipping');
      return;
    }

    console.log(`[WS] Connecting to: ${url}`);
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        reconnectCountRef.current = 0;
        
        // 큐에 쌓인 메시지 전송
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }
        
        onOpenRef.current?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        onErrorRef.current?.(event);
      };

      ws.onclose = (event) => {
        console.log(`[WS] Closed: ${event.code} ${event.reason || ''}`);
        setIsConnected(false);
        wsRef.current = null;
        
        onCloseRef.current?.();

        // 재연결 시도
        if (reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current++;
          console.log(`[WS] Reconnecting... (${reconnectCountRef.current}/${reconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else {
          console.error('[WS] Max reconnection attempts reached');
        }
      };
    } catch (error) {
      console.error('[WS] Connection error:', error);
    }
  }, [url, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    messageQueueRef.current = [];
  }, []);

  // send 함수는 ref를 사용하므로 의존성 없이 안정적
  const send = useCallback((data: any) => {
    const ws = wsRef.current;
    
    if (!ws) {
      console.warn('[WS] Cannot send, WebSocket not initialized');
      messageQueueRef.current.push(data);
      connect();
      return;
    }

    const readyState = ws.readyState;
    
    if (readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('[WS] Send failed:', error);
        messageQueueRef.current.push(data);
      }
    } else if (readyState === WebSocket.CONNECTING) {
      // 연결 중이면 큐에 추가
      messageQueueRef.current.push(data);
      console.log('[WS] Message queued (connecting)');
    } else {
      console.warn(`[WS] Cannot send, connection not open (state: ${readyState})`);
      messageQueueRef.current.push(data);
      
      // 연결이 끊어졌으면 재연결 시도
      if (readyState === WebSocket.CLOSED) {
        connect();
      }
    }
  }, [connect]);

  useEffect(() => {
    // React Strict Mode에서 중복 연결 방지
    let shouldConnect = true;
    
    const initConnection = () => {
      if (shouldConnect) {
        connect();
      }
    };
    
    initConnection();

    return () => {
      shouldConnect = false;
      disconnect();
    };
  }, [url]); // url만 의존성으로 사용

  return {
    send,
    disconnect,
    isConnected,
    reconnect: connect,
  };
}
