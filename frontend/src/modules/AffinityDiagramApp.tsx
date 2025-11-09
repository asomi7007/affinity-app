import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useWebSocket } from '../ws/useWebSocket';
import { Grid2X2, Split, Columns2, Square } from 'lucide-react';

interface Postit {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  isPinned: boolean;
  zIndex?: number;
}

// 실시간 이벤트 타입 정의
type BaseEvt = { version?: number };
type RealtimeEvent =
  | (BaseEvt & { type: 'note.add'; note: Postit })
  | (BaseEvt & { type: 'note.move'; id: string; x: number; y: number })
  | (BaseEvt & { type: 'note.update'; id: string; text: string })
  | (BaseEvt & { type: 'note.pin'; id: string; isPinned: boolean })
  | (BaseEvt & { type: 'board.gridMode'; mode: typeof gridModes[number] })
  | (BaseEvt & { type: 'board.sectionTitle'; section: string; title: string })
  | (BaseEvt & { type: 'board.reset' })
  | (BaseEvt & { type: 'sync.request' })
  | (BaseEvt & { type: 'sync.state'; notes: Postit[]; gridMode: typeof gridModes[number]; sectionTitles: Record<string,string> })
  | (BaseEvt & { type: string; [k: string]: any });

const gridModes = ['none','2-col','2-row','4-grid'] as const;

const colors = [
  { name: 'yellow', bg: 'bg-yellow-300', border: 'border-yellow-400' },
  { name: 'pink', bg: 'bg-pink-300', border: 'border-pink-400' },
  { name: 'mint', bg: 'bg-emerald-300', border: 'border-emerald-400' },
  { name: 'purple', bg: 'bg-violet-300', border: 'border-violet-400' },
  { name: 'orange', bg: 'bg-orange-300', border: 'border-orange-400' }
];

const AffinityDiagramApp: React.FC = () => {
  const [postits, setPostits] = useState<Postit[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [editingDraft, setEditingDraft] = useState<string>('');
  const [gridMode, setGridMode] = useState<'none'|'2-col'|'2-row'|'4-grid'>('none');
  const [stateVersion, setStateVersion] = useState<number>(0);
  const [sectionTitles, setSectionTitles] = useState<Record<string,string>>({
    topLeft: '', topRight: '', bottomLeft: '', bottomRight: '',
    left: '', right: '', top: '', bottom: ''
  });
  const [sectionDrafts, setSectionDrafts] = useState<Record<string,string>>({
    topLeft: '', topRight: '', bottomLeft: '', bottomRight: '',
    left: '', right: '', top: '', bottom: ''
  });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const lastDragSendRef = useRef<number>(0);
  const dragQueueRef = useRef<{id:string,x:number,y:number}|null>(null);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const forceRerender = useState(0)[1];
  const composingNoteRef = useRef<{id:string; value:string}|null>(null);
  const composingSectionRef = useRef<{section:string; value:string}|null>(null);
  const textUpdateTimerRef = useRef<{[id:string]: number}>({});
  // IME 입력(한글 등) 중복 문제를 줄이기 위해 별도 상태를 두지 않고
  // nativeEvent.isComposing 플래그만 활용한다.
  const whiteboardRef = useRef<HTMLDivElement | null>(null);
  // 디버그 플래그 기본값 보장
  useEffect(()=>{
    const w = window as any;
    if (w.DEBUG_DRAG === undefined) w.DEBUG_DRAG = false;
    if (w.DEBUG_DRAG_VERBOSE === undefined) w.DEBUG_DRAG_VERBOSE = false;
    if (w.DEBUG_CREATE === undefined) w.DEBUG_CREATE = false;
    if (w.DEBUG_SECTION === undefined) w.DEBUG_SECTION = true; // 섹션 편집 디버그 기본 on
  },[]);

  // WebSocket 연결 (고정 보드 아이디 사용: prod-board)
  const boardId = 'prod-board';
  // Codespaces를 위해 동적으로 WebSocket URL 생성
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/board/${boardId}`;
  const { send, isConnected } = useWebSocket(wsUrl, {
    onMessage: useCallback((msg: RealtimeEvent) => {
      // 버전 필터링: 메시지에 version 있고 로컬보다 작거나 같으면 무시
      if (typeof msg.version === 'number' && msg.type !== 'sync.state') {
        if (msg.version <= stateVersion) return;
      }
      switch (msg.type) {
      case 'note.add':
        setPostits(prev => prev.find(p=>p.id===msg.note.id)? prev : [...prev, msg.note]);
        break;
      case 'note.move':
        setPostits(prev => prev.map(p => p.id === msg.id ? { ...p, x: msg.x, y: msg.y } : p));
        break;
      case 'note.update':
        if (composingNoteRef.current && composingNoteRef.current.id === msg.id) break;
        setPostits(prev => prev.map(p => p.id === msg.id ? { ...p, text: msg.text } : p));
        if (editingId === msg.id) setEditingDraft(msg.text);
        break;
      case 'note.pin':
        setPostits(prev => prev.map(p => p.id === msg.id ? { ...p, isPinned: msg.isPinned } : p));
        break;
      case 'board.gridMode':
        setGridMode(msg.mode);
        break;
      case 'board.sectionTitle':
        // 조합 중이면 수신 업데이트는 잠시 무시 (낙관적으로 로컬 유지)
        if (composingSectionRef.current && composingSectionRef.current.section === msg.section) break;
        setSectionTitles(prev => ({ ...prev, [msg.section]: msg.title }));
        setSectionDrafts(prev => ({ ...prev, [msg.section]: msg.title }));
        break;
      case 'board.reset':
        // 서버가 sync.state를 별도로 브로드캐스트하므로 여기서는 즉시 처리 X (fallback)
        break;
      case 'sync.state':
        setPostits(msg.notes);
        setGridMode(msg.gridMode);
        setSectionTitles(msg.sectionTitles);
        if (typeof msg.version === 'number') setStateVersion(msg.version);
        break;
      case 'sync.request':
        // 무시 (브라우저 측 초기 요청용)
        break;
    }
    if (typeof msg.version === 'number') setStateVersion(msg.version);
  }, [stateVersion]),
    onOpen: () => {
      console.log('[App] WebSocket connected');
      // 연결 시 초기 데이터 요청
      send({ type: 'sync.request' });
    },
    onClose: () => {
      console.log('[App] WebSocket disconnected');
    },
    onError: (error) => {
      console.error('[App] WebSocket error:', error);
    },
  });

  // sendWebSocketMessage - 연결 상태 확인 후 전송
  const sendWebSocketMessage = useCallback((message: any) => {
    if (!isConnected) {
      console.warn('[App] Cannot send message, not connected');
      return;
    }
    send(message);
  }, [send, isConnected]);

  const generateId = () => {
    const t = Date.now().toString(36);
    const r = Math.random().toString(36).slice(2,8);
    return `${t}_${r}`; // 매우 낮은 충돌 확률
  };

  const createPostit = (color: typeof colors[number]) => {
    const rect = whiteboardRef.current?.getBoundingClientRect();
    const safeId = generateId();
    let baseW = rect?.width ?? 0;
    let baseH = rect?.height ?? 0;
    if (!rect || baseW < 50 || baseH < 50) {
      // 아직 레이아웃 계산 전이면 화면 좌측 상단 기본 위치
      baseW = 400; baseH = 300;
    }
    let x = Math.max(40, Math.min(baseW/2 - 90, baseW - 140));
    let y = Math.max(40, Math.min(baseH/2 - 60, baseH - 120));
    const newPostit: Postit = {
      id: safeId,
      text: '',
      color: color.name,
      x,
      y,
      isPinned: false
    };
    if ((window as any).DEBUG_CREATE) console.debug('[note.create]', newPostit, rect);
    setPostits(prev => [...prev, newPostit]);
    sendWebSocketMessage({ type: 'note.add', note: newPostit });
  };

  const updateText = (id: string, text: string, opts?: { composing?: boolean }) => {
    setPostits(prev => prev.map(p => p.id === id ? { ...p, text } : p));
    if (opts?.composing) {
      composingNoteRef.current = { id, value: text };
      return; // 조합 중에는 서버 전송 지연
    }
    sendWebSocketMessage({ type: 'note.update', id, text });
  };

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    setPostits(prev => prev.map(p => p.id === id ? { ...p, isPinned: !p.isPinned } : p));
    const target = postits.find(p=>p.id===id);
    if (target) sendWebSocketMessage({ type: 'note.pin', id, isPinned: !target.isPinned });
  };

  // Snap
  const snapToNearby = (dragged: {id:string,x:number,y:number}) => {
    const snap = 25; const w = 128; const h = 96;
    let nx = dragged.x; let ny = dragged.y;
    for (const p of postits) {
      if (p.id === dragged.id || p.isPinned) continue;
      const dx = Math.abs(dragged.x - p.x);
      const dy = Math.abs(dragged.y - p.y);
      if (dx < snap && dy > 20) nx = p.x;
      if (dy < snap && dx > 20) ny = p.y;
      const right = p.x + w + 5;
      if (Math.abs(dragged.x - right) < snap && Math.abs(dragged.y - p.y) < snap) { nx = right; ny = p.y; }
      const bottom = p.y + h + 5;
      if (Math.abs(dragged.y - bottom) < snap && Math.abs(dragged.x - p.x) < snap) { ny = bottom; nx = p.x; }
      const left = p.x - w - 5;
      if (Math.abs(dragged.x - left) < snap && Math.abs(dragged.y - p.y) < snap) { nx = left; ny = p.y; }
      const top = p.y - h - 5;
      if (Math.abs(dragged.y - top) < snap && Math.abs(dragged.x - p.x) < snap) { ny = top; nx = p.x; }
    }
    return { x: nx, y: ny };
  };

  const handlePointerDown = (e: React.PointerEvent, id: string) => {
    if (editingId === id) return;
    const postit = postits.find(p => p.id === id); if (postit?.isPinned) return;
    const targetEl = e.target as HTMLElement;
    if (targetEl.tagName === 'TEXTAREA') return;
    if (targetEl.closest('button[data-pin]')) return; // 핀 버튼 클릭시 드래그 시작 방지
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setDraggedId(id);
    setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setPostits(prev => prev.map(p => ({ ...p, zIndex: p.id === id ? 1000 : (p.zIndex || 1) })));
    if ((window as any).DEBUG_DRAG) console.debug('[drag] start', { id, x: e.clientX, y: e.clientY });
  };

  const doDragMove = (clientX: number, clientY: number) => {
    if (!draggedId || !whiteboardRef.current) return;
    const rect = whiteboardRef.current.getBoundingClientRect();
    let x = clientX - rect.left - dragOffset.x;
    let y = clientY - rect.top - dragOffset.y;
    x = Math.max(0, Math.min(x, rect.width - 130));
    y = Math.max(0, Math.min(y, rect.height - 100));
    const snap = snapToNearby({ id: draggedId, x, y });
    setPostits(prev => prev.map(p => p.id === draggedId ? { ...p, x: snap.x, y: snap.y } : p));
    if ((window as any).DEBUG_DRAG_VERBOSE) console.debug('[drag] move', { id: draggedId, x: snap.x, y: snap.y });
    // throttle queue
    dragQueueRef.current = { id: draggedId, x: snap.x, y: snap.y };
    const now = performance.now();
    const interval = 90; // ms
    if (now - lastDragSendRef.current >= interval) {
      flushDragMove();
    }
  };

  const flushDragMove = () => {
    if (!dragQueueRef.current) return;
    const payload = dragQueueRef.current;
    dragQueueRef.current = null;
    lastDragSendRef.current = performance.now();
    sendWebSocketMessage({ type: 'note.move', id: payload.id, x: payload.x, y: payload.y });
    if ((window as any).DEBUG_DRAG) console.debug('[drag] live', payload);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!draggedId) return;
    doDragMove(e.clientX, e.clientY);
  };
  const handlePointerUp = (e: PointerEvent) => {
    if (!draggedId) return;
    flushDragMove();
    const moved = postits.find(n=>n.id===draggedId);
    if (moved && (window as any).DEBUG_DRAG) console.debug('[drag] end', { id: moved.id, x: moved.x, y: moved.y });
    setDraggedId(null);
  };

  useEffect(() => {
    if (draggedId) {
      const pm = (e: PointerEvent) => handlePointerMove(e);
      const pu = (e: PointerEvent) => handlePointerUp(e);
      document.addEventListener('pointermove', pm);
      document.addEventListener('pointerup', pu);
      document.body.style.userSelect = 'none';
      document.body.style.touchAction = 'none';
      const timer = setInterval(()=>{ flushDragMove(); }, 120);
      return () => {
        document.removeEventListener('pointermove', pm);
        document.removeEventListener('pointerup', pu);
        document.body.style.userSelect = '';
        document.body.style.touchAction = '';
        clearInterval(timer);
        flushDragMove();
      };
    }
  }, [draggedId, dragOffset]);

  const handleDoubleClick = (e: React.MouseEvent, id: string) => { e.stopPropagation(); setEditingId(id); };
  const handleEditComplete = () => setEditingId(null);

  const handleKeyDown = (e: React.KeyboardEvent, cb: () => void) => {
    // 조합 중(한글/일본어 등)에는 Enter 처리 안 함
    if ((e.nativeEvent as any).isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      cb(); 
    }
  };

  const updateSectionTitle = (section: string, title: string, opts?: { final?: boolean }) => {
    if (!opts?.final) {
      // 편집 중: draft만 갱신 (최종 확정 전 전파/워터마크 미변경)
      setSectionDrafts(prev => ({ ...prev, [section]: title }));
      return;
    }
    // 확정 시 최종 state + draft 동기화 후 1회 전송
    setSectionTitles(prev => ({ ...prev, [section]: title }));
    setSectionDrafts(prev => ({ ...prev, [section]: title }));
    sendWebSocketMessage({ type: 'board.sectionTitle', section, title });
  };

  const renderGridLines = () => {
    if (gridMode === 'none') return null;
    return (
      <div className="absolute inset-0 pointer-events-none">
        {gridMode === '2-col' && <div className="h-full w-px bg-gray-400 absolute left-1/2 -translate-x-1/2" />}
        {gridMode === '2-row' && <div className="w-full h-px bg-gray-400 absolute top-1/2 -translate-y-1/2" />}
        {gridMode === '4-grid' && <>
          <div className="h-full w-px bg-gray-400 absolute left-1/2 -translate-x-1/2" />
          <div className="w-full h-px bg-gray-400 absolute top-1/2 -translate-y-1/2" />
        </>}
      </div>
    );
  };

  const SectionTitle: React.FC<{section:string,title:string,position:string,placeholder:string}> = ({ section, title, position, placeholder }) => {
    const isEditing = editingSection === section;
    const inputRef = useRef<HTMLInputElement|null>(null);
    useEffect(()=>{
      if (isEditing && inputRef.current){
        inputRef.current.focus();
        const val = inputRef.current.value;
        inputRef.current.setSelectionRange(val.length, val.length);
      }
    },[isEditing]);
    return (
      <div className={`absolute ${position} z-30 select-none`}>
        {!isEditing && (
          <div
            data-section-title-static={section}
            className="text-gray-500 font-semibold text-lg cursor-pointer hover:text-gray-700 px-0.5"
            onClick={()=>{ setEditingSection(section); }}
          >
            {title || placeholder}
          </div>
        )}
        {isEditing && (
          <input
            ref={inputRef}
            data-section-edit={section}
            value={sectionDrafts[section]}
            placeholder={placeholder}
            spellCheck={false}
            onChange={e=>{ 
              const v = e.target.value;
              updateSectionTitle(section, v);
              // 조합 중이 아닐 때만 ref 클리어
              if (!(e.nativeEvent as any).isComposing) {
                composingSectionRef.current = null;
              }
            }}
            onCompositionStart={e => {
              // 조합 시작: 현재 값으로 ref 설정
              composingSectionRef.current = { section, value: sectionDrafts[section] };
            }}
            onCompositionUpdate={e => {
              // 조합 중: 실시간 값 업데이트
              const target = e.target as HTMLInputElement;
              const v = target.value;
              composingSectionRef.current = { section, value: v };
              updateSectionTitle(section, v);
            }}
            onCompositionEnd={e => {
              // 조합 완료: ref 초기화 및 최종 값 반영
              const target = e.target as HTMLInputElement;
              updateSectionTitle(section, target.value);
              composingSectionRef.current = null;
            }}
            onKeyDown={e=>{
              if((e.nativeEvent as any).isComposing) return;
              if(e.key==='Enter') { 
                e.preventDefault(); 
                updateSectionTitle(section, sectionDrafts[section], { final:true }); 
                setEditingSection(null); 
              }
              else if(e.key==='Escape'){ 
                e.preventDefault(); 
                setSectionDrafts(prev=>({...prev,[section]:sectionTitles[section]})); 
                setEditingSection(null); 
              }
            }}
            onBlur={()=>{ 
              updateSectionTitle(section, sectionDrafts[section], { final:true }); 
              setEditingSection(null); 
            }}
            className="min-w-[4rem] max-w-[14rem] bg-transparent border-b-2 border-gray-400 outline-none font-semibold text-lg text-gray-800 px-0.5"
            style={{lineHeight:'1.1'}}
          />
        )}
      </div>
    );
  };

  const renderBackgroundTexts = () => {
    if (gridMode === 'none') return null;
    const arr: JSX.Element[] = [];
    const baseClass = "text-gray-400 opacity-15 font-black select-none text-center overflow-hidden -rotate-12";
    if (gridMode === '2-col') {
      arr.push(
        <div key="bg-left" className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2">
          <div className={`${baseClass} text-[4rem] max-w-[45vw] leading-tight`}>{sectionTitles.left || '왼쪽 영역'}</div>
        </div>,
        <div key="bg-right" className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2">
          <div className={`${baseClass} text-[4rem] max-w-[45vw] leading-tight`}>{sectionTitles.right || '오른쪽 영역'}</div>
        </div>
      );
    } else if (gridMode === '2-row') {
      arr.push(
        <div key="bg-top" className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`${baseClass} text-[4rem] max-w-[80vw] leading-tight`}>{sectionTitles.top || '상단 영역'}</div>
        </div>,
        <div key="bg-bottom" className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2">
          <div className={`${baseClass} text-[4rem] max-w-[80vw] leading-tight`}>{sectionTitles.bottom || '하단 영역'}</div>
        </div>
      );
    } else if (gridMode === '4-grid') {
      arr.push(
        <div key="bg-tl" className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2">
          <div className={`${baseClass} text-[3rem] max-w-[40vw] leading-tight`}>{sectionTitles.topLeft || '1사분면'}</div>
        </div>,
        <div key="bg-tr" className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2">
          <div className={`${baseClass} text-[3rem] max-w-[40vw] leading-tight`}>{sectionTitles.topRight || '2사분면'}</div>
        </div>,
        <div key="bg-bl" className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2">
          <div className={`${baseClass} text-[3rem] max-w-[40vw] leading-tight`}>{sectionTitles.bottomLeft || '3사분면'}</div>
        </div>,
        <div key="bg-br" className="absolute bottom-1/4 right-1/4 translate-x-1/2 -translate-y-1/2">
          <div className={`${baseClass} text-[3rem] max-w-[40vw] leading-tight`}>{sectionTitles.bottomRight || '4사분면'}</div>
        </div>
      );
    }
    return (
      <div className="absolute inset-0 pointer-events-none z-0">{arr}</div>
    );
  };

  const renderSectionTitles = () => {
    if (gridMode === 'none') return null;
    const arr: JSX.Element[] = [];
    if (gridMode === '2-col') {
      arr.push(
        <SectionTitle key="left" section="left" title={sectionTitles.left} position="top-4 left-4" placeholder="왼쪽 영역" />,
        <SectionTitle key="right" section="right" title={sectionTitles.right} position="top-4 right-4" placeholder="오른쪽 영역" />
      );
    } else if (gridMode === '2-row') {
      arr.push(
        <SectionTitle key="top" section="top" title={sectionTitles.top} position="top-4 left-1/2 -translate-x-1/2" placeholder="상단 영역" />,
        <SectionTitle key="bottom" section="bottom" title={sectionTitles.bottom} position="bottom-4 left-1/2 -translate-x-1/2" placeholder="하단 영역" />
      );
    } else if (gridMode === '4-grid') {
      arr.push(
        <SectionTitle key="topLeft" section="topLeft" title={sectionTitles.topLeft} position="top-4 left-4" placeholder="1사분면" />,
        <SectionTitle key="topRight" section="topRight" title={sectionTitles.topRight} position="top-4 right-4" placeholder="2사분면" />,
        <SectionTitle key="bottomLeft" section="bottomLeft" title={sectionTitles.bottomLeft} position="bottom-4 left-4" placeholder="3사분면" />,
        <SectionTitle key="bottomRight" section="bottomRight" title={sectionTitles.bottomRight} position="bottom-4 right-4" placeholder="4사분면" />
      );
    }
    return arr;
  };

  const [paletteOpen, setPaletteOpen] = useState(true);

  const handleResetBoard = () => {
    if (!confirm('보드를 초기화하시겠습니까? (모든 포스트잇과 분면 정보가 삭제됩니다)')) return;
    sendWebSocketMessage({ type: 'board.reset' });
  };
  // 편집 대상 변경 시 draft 초기화
  useEffect(()=>{
    if (editingId) {
      const found = postits.find(p=>p.id===editingId);
      setEditingDraft(found? found.text: '');
    } else {
      setEditingDraft('');
    }
  },[editingId]);

  // 분면 제목 자동 포커스 & 캐럿 끝 이동 (빈 문자열일 때는 selection 조작 생략)
  useEffect(()=>{
    if (!editingSection) return;
    requestAnimationFrame(()=>{
      const el = whiteboardRef.current?.querySelector(`[data-section-edit="${editingSection}"]`) as HTMLElement | null;
      if (!el) return;
      try { el.focus(); } catch {}
      if (el.innerText.length === 0) return; // 빈 경우 바로 타이핑 가능하도록 selection 조작 생략
      try {
        const sel = window.getSelection();
        if (sel) {
          const range = document.createRange();
          range.selectNodeContents(el);
          range.collapse(false);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } catch {}
    });
  },[editingSection]);

  // 배경 클릭으로 섹션 편집 진입 기능 제거 (요청사항)

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* 연결 상태 표시 */}
      <div className="fixed top-3 right-3 z-[1000]">
        <div className={`px-3 py-2 rounded-lg shadow-md text-sm font-medium ${
          isConnected 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <div className="bg-white shadow-md px-4 md:px-6 py-3 flex items-center gap-3 md:gap-4">
        <h1 className="text-xl font-bold text-gray-800">어피니티 다이어그램</h1>
        <button onClick={()=>setPaletteOpen(p=>!p)} className="md:hidden ml-auto px-3 py-2 text-sm rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium">
          {paletteOpen? '팔레트 숨기기':'팔레트 열기'}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">분면:</span>
          <button aria-label="분면 없음" title="분면 없음" onClick={()=>{ setGridMode('none'); sendWebSocketMessage({ type: 'board.gridMode', mode: 'none' }); }} className={`p-2 rounded-lg ${gridMode==='none'?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}> <Square size={18}/> </button>
          <button aria-label="2열 분할" title="2열" onClick={()=>{ setGridMode('2-col'); sendWebSocketMessage({ type: 'board.gridMode', mode: '2-col' }); }} className={`p-2 rounded-lg ${gridMode==='2-col'?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}> <Columns2 size={18}/> </button>
            <button aria-label="2행 분할" title="2행" onClick={()=>{ setGridMode('2-row'); sendWebSocketMessage({ type: 'board.gridMode', mode: '2-row' }); }} className={`p-2 rounded-lg ${gridMode==='2-row'?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}> <Split size={18}/> </button>
          <button aria-label="4분면" title="4분면" onClick={()=>{ setGridMode('4-grid'); sendWebSocketMessage({ type: 'board.gridMode', mode: '4-grid' }); }} className={`p-2 rounded-lg ${gridMode==='4-grid'?'bg-blue-100 text-blue-600':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}> <Grid2X2 size={18}/> </button>
          <button aria-label="보드 초기화" title="Reset" onClick={handleResetBoard} className="ml-2 px-3 py-2 text-xs font-semibold rounded-md bg-red-50 text-red-600 hover:bg-red-100 border border-red-200">
            RESET
          </button>
          <button onClick={()=>setShowDebugPanel(s=>!s)} aria-label="디버그 패널 토글" className="ml-2 px-3 py-2 text-xs font-semibold rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300">
            {showDebugPanel? 'Debug ▲':'Debug ▼'}
          </button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className={`bg-white shadow-lg flex flex-col py-4 md:py-6 transition-all duration-300 ${paletteOpen? 'w-20':'w-0 md:w-20'} ${paletteOpen? 'opacity-100':'opacity-0 md:opacity-100'} overflow-hidden`}>          
          <h2 className="text-xs font-semibold text-gray-600 text-center mb-4">POST-IT</h2>
          <div className="flex flex-col items-center gap-3 px-2">
            {colors.map(c => (
              <button key={c.name} onClick={()=>createPostit(c)} className={`w-12 h-12 ${c.bg} ${c.border} border-2 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20">
                  <div className="h-full border-l border-gray-400 ml-2" />
                  <div className="absolute top-2 left-0 right-0 h-px bg-gray-400" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-gray-600 font-bold text-lg">+</span></div>
              </button>
            ))}
          </div>
        </div>
  <div ref={whiteboardRef} className="flex-1 relative bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden touch-none select-none">
          {renderBackgroundTexts()}
          {renderGridLines()}
          {renderSectionTitles()}
          {postits.map(p => {
            const colorConfig = colors.find(c => c.name === p.color)!;
            const isEditing = editingId === p.id;
            const isDragging = draggedId === p.id;
            return (
        <div key={p.id} data-postit
          className={`absolute transition-all duration-150 select-none touch-none z-10 ${isDragging?'scale-105 opacity-80':'hover:scale-105'} ${p.isPinned?'cursor-default':(isEditing?'cursor-text':'cursor-move')} ${hoverId===p.id && !isDragging ? 'outline outline-1 outline-gray-400/60 shadow-sm' : ''}`}
                   style={{ left:p.x, top:p.y, zIndex: p.zIndex || (isEditing?999:1) }}
          onPointerDown={e=>handlePointerDown(e,p.id)}
                    onPointerEnter={()=>setHoverId(p.id)}
                    onPointerLeave={()=>setHoverId(h=>h===p.id?null:h)}
                    onDoubleClick={e=>handleDoubleClick(e,p.id)}
                    onMouseUp={()=>{ if(isDragging){ const moved = postits.find(n=>n.id===p.id); if(moved) sendWebSocketMessage({ type:'note.move', id: p.id, x: moved.x, y: moved.y }); } }}>
                <div className={`min-w-32 min-h-24 p-4 rounded-lg ${colorConfig.bg} ${colorConfig.border} border-2 shadow-md relative overflow-visible ${isEditing?'ring-2 ring-blue-400 ring-opacity-50':''} ${p.isPinned?'ring-2 ring-red-400 ring-opacity-50':''}`}>
                  <button data-pin onClick={e=>togglePin(e,p.id)} className={`absolute -top-2 -right-2 w-6 h-6 rounded-full shadow-md ${p.isPinned?'bg-red-500 text-white':'bg-white text-gray-500'} hover:scale-110 transition flex items-center justify-center`} title={p.isPinned?'고정 해제':'고정하기'}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className={p.isPinned?'':'opacity-50'}><path d="M16 12V4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v8c0 .55-.45 1-1 1s-1 .45-1 1 .45 1 1 1h3v5a1 1 0 0 0 2 0v-5h3c.55 0 1-.45 1-1s-.45-1-1-1c-.55 0-1-.45-1-1z"/></svg>
                  </button>
                  <div className="absolute inset-0 opacity-20 pointer-events-none">
                    <div className="h-full border-l border-gray-400 ml-1" />
                    <div className="absolute top-1 left-0 right-0 h-px bg-gray-400" />
                    </div>
                    <div className="relative z-10">
                      {isEditing ? (
                        <textarea value={editingDraft}
                                  onChange={e=>{
                                    const v = e.target.value;
                                    setEditingDraft(v);
                                    
                                    // 로컬 상태는 즉시 업데이트
                                    setPostits(prev => prev.map(n => n.id === p.id ? { ...n, text: v } : n));
                                    
                                    // 조합 중이 아닐 때만 서버 전송 (debounce)
                                    if (!(e.nativeEvent as any).isComposing) {
                                      composingNoteRef.current = null;
                                      
                                      // 기존 타이머 취소
                                      if (textUpdateTimerRef.current[p.id]) {
                                        clearTimeout(textUpdateTimerRef.current[p.id]);
                                      }
                                      
                                      // 300ms 후 서버 전송 (debounce)
                                      textUpdateTimerRef.current[p.id] = window.setTimeout(() => {
                                        sendWebSocketMessage({ type:'note.update', id:p.id, text:v });
                                      }, 300);
                                    }
                                  }}
                                  onCompositionStart={e => {
                                    // 조합 시작: 현재 값으로 ref 설정
                                    composingNoteRef.current = { id: p.id, value: editingDraft };
                                  }}
                                  onCompositionUpdate={e => {
                                    // 조합 중: 실시간 값 업데이트
                                    const target = e.target as HTMLTextAreaElement;
                                    const v = target.value;
                                    composingNoteRef.current = { id: p.id, value: v };
                                    setEditingDraft(v);
                                    setPostits(prev => prev.map(n => n.id === p.id ? { ...n, text: v } : n));
                                  }}
                                  onCompositionEnd={e => { 
                                    // 조합 완료: ref 초기화 및 최종 값 서버 전송
                                    const target = e.target as HTMLTextAreaElement;
                                    const v = target.value;
                                    setEditingDraft(v);
                                    setPostits(prev => prev.map(n => n.id === p.id ? { ...n, text: v } : n));
                                    composingNoteRef.current = null;
                                    
                                    // 조합 완료 후 즉시 서버 전송
                                    if (textUpdateTimerRef.current[p.id]) {
                                      clearTimeout(textUpdateTimerRef.current[p.id]);
                                    }
                                    sendWebSocketMessage({ type:'note.update', id:p.id, text:v });
                                  }}
                                  onBlur={e=>{ 
                                    // blur 시 타이머 취소하고 즉시 전송
                                    if (textUpdateTimerRef.current[p.id]) {
                                      clearTimeout(textUpdateTimerRef.current[p.id]);
                                      delete textUpdateTimerRef.current[p.id];
                                    }
                                    sendWebSocketMessage({ type:'note.update', id:p.id, text:editingDraft }); 
                                    handleEditComplete(); 
                                    composingNoteRef.current=null; 
                                  }}
                                  onKeyDown={e=>handleKeyDown(e,()=>{ 
                                    // Enter 시 타이머 취소하고 즉시 전송
                                    if (textUpdateTimerRef.current[p.id]) {
                                      clearTimeout(textUpdateTimerRef.current[p.id]);
                                      delete textUpdateTimerRef.current[p.id];
                                    }
                                    sendWebSocketMessage({ type:'note.update', id:p.id, text:editingDraft }); 
                                    handleEditComplete(); 
                                  })}
                                  placeholder="아이디어를 입력하세요..."
                                  autoFocus
                                  rows={3}
                                  className="w-full h-full bg-transparent resize-none outline-none text-gray-900 text-sm font-medium leading-snug" />
                      ) : (
                        <div className="text-gray-800 text-sm font-medium whitespace-pre-wrap break-words">{p.text || '더블클릭하여 편집'}</div>
                      )}
                    </div>
                </div>
              </div>
            );
          })}
          {postits.length===0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <div className="text-6xl mb-4">📝</div>
                <h2 className="text-2xl font-bold mb-2">어피니티 다이어그램 시작하기</h2>
                <p className="text-lg mb-2">좌측 팔레트에서 포스트잇을 클릭하여 추가해보세요!</p>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>• 포스트잇을 드래그하여 이동할 수 있습니다 (자석 효과)</div>
                  <div>• 포스트잇을 더블클릭하여 텍스트를 편집할 수 있습니다</div>
                  <div>• 우상단 핀을 클릭하여 고정할 수 있습니다</div>
                  <div>• 상단에서 분면을 선택할 수 있습니다</div>
                  <div>• 분면 제목을 클릭하여 편집할 수 있습니다</div>
                </div>
              </div>
            </div>
          )}
          {/* Debug Panel */}
          {showDebugPanel && (
            <div className="absolute top-4 right-4 z-50 w-64 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-lg shadow-lg p-3 space-y-2 text-xs text-gray-700">
              <div className="flex items-center justify-between">
                <strong className="text-gray-800">Debug Panel</strong>
                <button onClick={()=>setShowDebugPanel(false)} className="text-gray-500 hover:text-gray-700" aria-label="디버그 패널 닫기">✕</button>
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(window as any).DEBUG_CREATE===true} onChange={e=>{ (window as any).DEBUG_CREATE = e.target.checked; forceRerender(n=>n+1); }} />
                  <span>DEBUG_CREATE</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(window as any).DEBUG_DRAG===true} onChange={e=>{ (window as any).DEBUG_DRAG = e.target.checked; forceRerender(n=>n+1); }} />
                  <span>DEBUG_DRAG</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={(window as any).DEBUG_DRAG_VERBOSE===true} onChange={e=>{ (window as any).DEBUG_DRAG_VERBOSE = e.target.checked; forceRerender(n=>n+1); }} />
                  <span>DEBUG_DRAG_VERBOSE</span>
                </label>
              </div>
              <div className="pt-1 border-t border-gray-200 text-[10px] leading-snug text-gray-500">
                <div>Drag 전송: throttle 90ms / flush 120ms</div>
                <div>pointerup 시 마지막 위치 보정</div>
              </div>
            </div>
          )}
          {/* 헤더로 이동으로 기존 버튼 제거됨 */}
        </div>
      </div>
    </div>
  );
};

export default AffinityDiagramApp;
