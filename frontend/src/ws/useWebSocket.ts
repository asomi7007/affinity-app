import { useEffect, useRef } from 'react';

export function useWebSocket(path: string, onMessage: (data: any) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 기본: 환경변수 없으면 현재 페이지 host 기준 8000 포트 추정
  // Vite 환경변수 접근 (타입 선언 없을 수 있어 any 캐스트)
  const metaAny: any = import.meta as any;
  let base = metaAny?.env?.VITE_API_BASE as string | undefined;
    if (!base && typeof window !== 'undefined') {
      const loc = window.location;
      // 프론트가 5173(개발) 등에서 열렸다면 백엔드는 8000으로 가정
      const apiPort = (loc.port === '5173' || loc.port === '3000') ? '8000' : loc.port;
      base = `${loc.protocol}//${loc.hostname}:${apiPort}`;
    }
    if (!base) base = 'http://localhost:8000';
    const httpUrl = base.replace(/\/$/, '') + path;
    let wsUrl = httpUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
  ws.onopen = () => { if (metaAny?.env?.DEV) console.info('[WS] open', wsUrl); };
  ws.onclose = (e) => { if (metaAny?.env?.DEV) console.info('[WS] close', e.code, e.reason); };
  ws.onerror = (e) => { if (metaAny?.env?.DEV) console.error('[WS] error', e); };
    ws.onmessage = (ev) => {
  try { onMessage(JSON.parse(ev.data)); } catch (err) { if (metaAny?.env?.DEV) console.warn('WS parse error', err); }
    };
    return () => ws.close();
  }, [path, onMessage]);

  const send = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return { send };
}
