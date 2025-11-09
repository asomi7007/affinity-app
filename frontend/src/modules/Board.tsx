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
    // Smart Guides / Snap to Edge 구현
    const SNAP_THRESHOLD = 8; // Adobe/Figma 표준: 8-10px
    const NOTE_WIDTH = 160;
    const NOTE_HEIGHT = 110;
    
    let nx = x;
    let ny = y;
    let snappedX: number | undefined;
    let snappedY: number | undefined;
    
    // 모든 포스트잇의 스냅 포인트 수집
    interface SnapPoint {
      value: number;
      distance: number;
      line: number; // 가이드라인 표시용
    }
    
    const xSnapPoints: SnapPoint[] = [];
    const ySnapPoints: SnapPoint[] = [];
    
    const currentLeft = x;
    const currentRight = x + NOTE_WIDTH;
    const currentCenterX = x + NOTE_WIDTH / 2;
    const currentTop = y;
    const currentBottom = y + NOTE_HEIGHT;
    const currentCenterY = y + NOTE_HEIGHT / 2;
    
    // 모든 다른 포스트잇과 비교하여 스냅 포인트 수집
    notes.filter(n => n.id !== id).forEach(other => {
      const otherLeft = other.x;
      const otherRight = other.x + NOTE_WIDTH;
      const otherCenterX = other.x + NOTE_WIDTH / 2;
      const otherTop = other.y;
      const otherBottom = other.y + NOTE_HEIGHT;
      const otherCenterY = other.y + NOTE_HEIGHT / 2;
      
      // X축 스냅 포인트 (왼쪽, 오른쪽, 중앙 3가지)
      // 왼쪽 → 왼쪽
      const leftToLeft = Math.abs(currentLeft - otherLeft);
      if (leftToLeft < SNAP_THRESHOLD) {
        xSnapPoints.push({ value: otherLeft - currentLeft, distance: leftToLeft, line: otherLeft });
      }
      
      // 오른쪽 → 오른쪽
      const rightToRight = Math.abs(currentRight - otherRight);
      if (rightToRight < SNAP_THRESHOLD) {
        xSnapPoints.push({ value: otherRight - currentRight, distance: rightToRight, line: otherRight });
      }
      
      // 왼쪽 → 오른쪽 (붙이기)
      const leftToRight = Math.abs(currentLeft - otherRight);
      if (leftToRight < SNAP_THRESHOLD) {
        xSnapPoints.push({ value: otherRight - currentLeft, distance: leftToRight, line: otherRight });
      }
      
      // 오른쪽 → 왼쪽 (붙이기)
      const rightToLeft = Math.abs(currentRight - otherLeft);
      if (rightToLeft < SNAP_THRESHOLD) {
        xSnapPoints.push({ value: otherLeft - currentRight, distance: rightToLeft, line: otherLeft });
      }
      
      // 중앙 → 중앙
      const centerToCenter = Math.abs(currentCenterX - otherCenterX);
      if (centerToCenter < SNAP_THRESHOLD) {
        xSnapPoints.push({ value: otherCenterX - currentCenterX, distance: centerToCenter, line: otherCenterX });
      }
      
      // Y축 스냅 포인트 (위, 아래, 중앙 3가지)
      // 위 → 위
      const topToTop = Math.abs(currentTop - otherTop);
      if (topToTop < SNAP_THRESHOLD) {
        ySnapPoints.push({ value: otherTop - currentTop, distance: topToTop, line: otherTop });
      }
      
      // 아래 → 아래
      const bottomToBottom = Math.abs(currentBottom - otherBottom);
      if (bottomToBottom < SNAP_THRESHOLD) {
        ySnapPoints.push({ value: otherBottom - currentBottom, distance: bottomToBottom, line: otherBottom });
      }
      
      // 위 → 아래 (붙이기)
      const topToBottom = Math.abs(currentTop - otherBottom);
      if (topToBottom < SNAP_THRESHOLD) {
        ySnapPoints.push({ value: otherBottom - currentTop, distance: topToBottom, line: otherBottom });
      }
      
      // 아래 → 위 (붙이기)
      const bottomToTop = Math.abs(currentBottom - otherTop);
      if (bottomToTop < SNAP_THRESHOLD) {
        ySnapPoints.push({ value: otherTop - currentBottom, distance: bottomToTop, line: otherTop });
      }
      
      // 중앙 → 중앙
      const centerYToCenter = Math.abs(currentCenterY - otherCenterY);
      if (centerYToCenter < SNAP_THRESHOLD) {
        ySnapPoints.push({ value: otherCenterY - currentCenterY, distance: centerYToCenter, line: otherCenterY });
      }
    });
    
    // 가장 가까운 X축 스냅 포인트 적용
    if (xSnapPoints.length > 0) {
      xSnapPoints.sort((a, b) => a.distance - b.distance);
      const closest = xSnapPoints[0];
      nx = x + closest.value;
      snappedX = closest.line;
    }
    
    // 가장 가까운 Y축 스냅 포인트 적용
    if (ySnapPoints.length > 0) {
      ySnapPoints.sort((a, b) => a.distance - b.distance);
      const closest = ySnapPoints[0];
      ny = y + closest.value;
      snappedY = closest.line;
    }
    
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
