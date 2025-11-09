import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StickyNote } from './StickyNote';
import { useWebSocket } from '../ws/useWebSocket';
import { nanoid } from 'nanoid/non-secure';

interface NoteBase { id: string; text: string; x: number; y: number; color: string }
type EventMessage =
  | { type: 'note.add'; note: NoteBase }
  | { type: 'note.move'; note: Pick<NoteBase,'id'|'x'|'y'> }
  | { type: 'note.update'; note: Pick<NoteBase,'id'|'text'> };

interface Note {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

const boardId = 'dev-board';
const COLORS = ['#FFE066','#FFC6FF','#BEE1E6']; // palette primary three

export const Board: React.FC = () => {
  const [notes, setNotes] = useState<NoteBase[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snapGuides, setSnapGuides] = useState<{ x?: number; y?: number }>({});
  const boardRef = useRef<HTMLDivElement | null>(null);
  const { send } = useWebSocket(`/ws/board/${boardId}`, (msg: EventMessage) => {
    switch (msg.type) {
      case 'note.add':
        setNotes(prev => prev.find(p=>p.id===msg.note.id)? prev : [...prev, msg.note]);
        break;
      case 'note.move':
        setNotes(prev => prev.map(n => n.id === msg.note.id ? { ...n, x: msg.note.x, y: msg.note.y } : n));
        break;
      case 'note.update':
        setNotes(prev => prev.map(n => n.id === msg.note.id ? { ...n, text: msg.note.text } : n));
        break;
    }
  });

  const createNoteWithColor = (color: string) => {
    // 중앙 근처 위치 계산
    const rect = boardRef.current?.getBoundingClientRect();
    const centerX = rect ? rect.width/2 - 80 : 300;
    const centerY = rect ? rect.height/2 - 80 : 200;
    const note: NoteBase = {
      id: nanoid(8),
      text: '',
      x: centerX + Math.random()*40 - 20,
      y: centerY + Math.random()*40 - 20,
      color
    };
    setNotes(prev => [...prev, note]);
    setEditingId(note.id);
    send({ type: 'note.add', note });
  };

  const onMove = (id: string, x: number, y: number, isDragging: boolean = false) => {
    // 스냅 정렬: 포스트잇 가장자리를 기준으로 정렬
    const SNAP_THRESHOLD = 15; // 스냅 감지 거리
    const NOTE_WIDTH = 160;
    const NOTE_HEIGHT = 110; // 최소 높이
    
    let nx = x;
    let ny = y;
    let snappedX: number | undefined;
    let snappedY: number | undefined;
    let xSnapped = false;
    let ySnapped = false;
    
    // 다른 포스트잇들과 비교하여 스냅 (첫 번째로 매칭되는 것만 적용)
    notes.filter(n => n.id !== id).forEach(other => {
      const otherLeft = other.x;
      const otherRight = other.x + NOTE_WIDTH;
      const otherTop = other.y;
      const otherBottom = other.y + NOTE_HEIGHT;
      
      // 현재 위치 기준 계산 (nx, ny 사용)
      const currentLeft = nx;
      const currentRight = nx + NOTE_WIDTH;
      const currentTop = ny;
      const currentBottom = ny + NOTE_HEIGHT;
      
      // X축 정렬 (수직 방향 - 좌우 정렬)
      // 왼쪽 가장자리 정렬
      if (!xSnapped && Math.abs(currentLeft - otherLeft) < SNAP_THRESHOLD) {
        nx = otherLeft;
        snappedX = otherLeft;
        xSnapped = true;
      }
      // 오른쪽 가장자리 정렬
      else if (!xSnapped && Math.abs(currentRight - otherRight) < SNAP_THRESHOLD) {
        nx = otherRight - NOTE_WIDTH;
        snappedX = otherRight;
        xSnapped = true;
      }
      // 왼쪽이 다른 것의 오른쪽에 붙기
      else if (!xSnapped && Math.abs(currentLeft - otherRight) < SNAP_THRESHOLD) {
        nx = otherRight;
        snappedX = otherRight;
        xSnapped = true;
      }
      // 오른쪽이 다른 것의 왼쪽에 붙기
      else if (!xSnapped && Math.abs(currentRight - otherLeft) < SNAP_THRESHOLD) {
        nx = otherLeft - NOTE_WIDTH;
        snappedX = otherLeft;
        xSnapped = true;
      }
      // 수직 중앙선 정렬
      else if (!xSnapped && Math.abs((currentLeft + NOTE_WIDTH / 2) - (other.x + NOTE_WIDTH / 2)) < SNAP_THRESHOLD) {
        nx = other.x + NOTE_WIDTH / 2 - NOTE_WIDTH / 2;
        snappedX = other.x + NOTE_WIDTH / 2;
        xSnapped = true;
      }
      
      // Y축 정렬 (수평 방향 - 상하 정렬)
      // 위쪽 가장자리 정렬
      if (!ySnapped && Math.abs(currentTop - otherTop) < SNAP_THRESHOLD) {
        ny = otherTop;
        snappedY = otherTop;
        ySnapped = true;
      }
      // 아래쪽 가장자리 정렬
      else if (!ySnapped && Math.abs(currentBottom - otherBottom) < SNAP_THRESHOLD) {
        ny = otherBottom - NOTE_HEIGHT;
        snappedY = otherBottom;
        ySnapped = true;
      }
      // 위쪽이 다른 것의 아래쪽에 붙기
      else if (!ySnapped && Math.abs(currentTop - otherBottom) < SNAP_THRESHOLD) {
        ny = otherBottom;
        snappedY = otherBottom;
        ySnapped = true;
      }
      // 아래쪽이 다른 것의 위쪽에 붙기
      else if (!ySnapped && Math.abs(currentBottom - otherTop) < SNAP_THRESHOLD) {
        ny = otherTop - NOTE_HEIGHT;
        snappedY = otherTop;
        ySnapped = true;
      }
      // 수평 중앙선 정렬
      else if (!ySnapped && Math.abs((currentTop + NOTE_HEIGHT / 2) - (other.y + NOTE_HEIGHT / 2)) < SNAP_THRESHOLD) {
        ny = other.y + NOTE_HEIGHT / 2 - NOTE_HEIGHT / 2;
        snappedY = other.y + NOTE_HEIGHT / 2;
        ySnapped = true;
      }
    });
    
    // 드래그 중일 때만 가이드라인 표시
    if (isDragging) {
      setSnapGuides({ x: snappedX, y: snappedY });
    } else {
      setSnapGuides({});
    }
    
    setNotes(prev => prev.map(n => n.id === id ? { ...n, x: nx, y: ny } : n));
    if (!isDragging) {
      send({ type: 'note.move', note: { id, x: nx, y: ny }});
    }
  };

  const onUpdateText = (id: string, text: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text } : n));
    send({ type: 'note.update', note: { id, text } });
  };

  const onEndEdit = (id: string) => {
    if (editingId === id) setEditingId(null);
  };

  return (
    <div style={{padding: '0', display:'flex', height: '100%', minHeight: '100%'}}>
      {/* Palette */}
      <div style={{width:120, padding:'16px 12px', background:'#1b1b1b', borderRight:'1px solid #2a2a2a', display:'flex', flexDirection:'column', gap:16}}>
        <div style={{fontSize:14, fontWeight:600, letterSpacing:.5, color:'#ddd'}}>PALETTE</div>
        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          {COLORS.map(c => (
            <button key={c} onClick={()=>createNoteWithColor(c)} style={{
              width:'100%', height:80, background:c, border:'none', borderRadius:12, cursor:'pointer',
              boxShadow:'0 4px 10px -2px rgba(0,0,0,0.45)',
              transition:'transform .18s ease, box-shadow .18s ease'
            }}
            onMouseDown={e=> e.currentTarget.style.transform='translateY(2px)'}
            onMouseUp={e=> e.currentTarget.style.transform=''}
            />
          ))}
        </div>
      </div>
      <div
        ref={boardRef}
        style={{
          position:'relative',
          width:'100%',
          height:600,
          marginTop:16,
          borderRadius:18,
          background: 'radial-gradient(circle at 20% 20%, #222 0%, #111 60%)',
          boxShadow:'0 8px 24px -6px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
          overflow:'hidden'
        }}
      >
        <div style={{position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize:'40px 40px'}} />
        
        {/* 스냅 가이드라인 */}
        {snapGuides.x !== undefined && (
          <div style={{
            position: 'absolute',
            left: snapGuides.x,
            top: 0,
            bottom: 0,
            width: 2,
            background: 'rgba(0, 200, 255, 0.6)',
            boxShadow: '0 0 8px rgba(0, 200, 255, 0.8)',
            pointerEvents: 'none',
            zIndex: 998
          }} />
        )}
        {snapGuides.y !== undefined && (
          <div style={{
            position: 'absolute',
            top: snapGuides.y,
            left: 0,
            right: 0,
            height: 2,
            background: 'rgba(0, 200, 255, 0.6)',
            boxShadow: '0 0 8px rgba(0, 200, 255, 0.8)',
            pointerEvents: 'none',
            zIndex: 998
          }} />
        )}
        
        {notes.map(n => (
          <StickyNote key={n.id} note={n} onMove={onMove} onUpdateText={onUpdateText} editing={editingId===n.id} onEndEdit={onEndEdit} />
        ))}
      </div>
    </div>
  );
};
