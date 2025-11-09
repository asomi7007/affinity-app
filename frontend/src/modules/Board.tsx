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
    // Smart Guides / Snap to Edge 구현 (Figma/Sketch 방식)
    const SNAP_THRESHOLD = 8; // Adobe/Figma 표준: 8-10px
    const ATTACH_SPACING = 0; // 붙일 때 간격 (0 = 딱 붙임)
    const NOTE_WIDTH = 160;
    const NOTE_HEIGHT = 110;
    
    let nx = x;
    let ny = y;
    let snappedX: number | undefined;
    let snappedY: number | undefined;
    
    // 스냅 포인트 인터페이스
    interface SnapPoint {
      targetX: number;  // 포스트잇이 이동할 최종 X 좌표
      distance: number; // 현재 위치에서의 거리
      guideLine: number; // 가이드라인 표시 위치
      type: string;     // 디버그용 타입
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
      
      // ========== X축 스냅 포인트 ==========
      
      // 1. 왼쪽 → 왼쪽 (Left-to-Left Alignment)
      const leftToLeftDist = Math.abs(currentLeft - otherLeft);
      if (leftToLeftDist < SNAP_THRESHOLD) {
        xSnapPoints.push({ 
          targetX: otherLeft,  // ✅ 다른 포스트잇의 왼쪽에 맞춤
          distance: leftToLeftDist, 
          guideLine: otherLeft,
          type: 'left-to-left'
        });
      }
      
      // 2. 오른쪽 → 오른쪽 (Right-to-Right Alignment)
      const rightToRightDist = Math.abs(currentRight - otherRight);
      if (rightToRightDist < SNAP_THRESHOLD) {
        xSnapPoints.push({ 
          targetX: otherRight - NOTE_WIDTH,  // ✅ 오른쪽을 맞추기 위해 NOTE_WIDTH만큼 뺌
          distance: rightToRightDist, 
          guideLine: otherRight,
          type: 'right-to-right'
        });
      }
      
      // 3. 왼쪽 → 오른쪽 붙이기 (Attach Left to Right)
      const leftToRightDist = Math.abs(currentLeft - otherRight);
      if (leftToRightDist < SNAP_THRESHOLD) {
        xSnapPoints.push({ 
          targetX: otherRight + ATTACH_SPACING,  // ✅ 다른 포스트잇 오른쪽에 딱 붙임
          distance: leftToRightDist, 
          guideLine: otherRight,
          type: 'attach-left-to-right'
        });
      }
      
      // 4. 오른쪽 → 왼쪽 붙이기 (Attach Right to Left)
      const rightToLeftDist = Math.abs(currentRight - otherLeft);
      if (rightToLeftDist < SNAP_THRESHOLD) {
        xSnapPoints.push({ 
          targetX: otherLeft - NOTE_WIDTH - ATTACH_SPACING,  // ✅ 다른 포스트잇 왼쪽에 붙임
          distance: rightToLeftDist, 
          guideLine: otherLeft,
          type: 'attach-right-to-left'
        });
      }
      
      // 5. 중앙 → 중앙 (Center Alignment)
      const centerXDist = Math.abs(currentCenterX - otherCenterX);
      if (centerXDist < SNAP_THRESHOLD) {
        xSnapPoints.push({ 
          targetX: otherCenterX - NOTE_WIDTH / 2,  // ✅ 중앙을 맞춤
          distance: centerXDist, 
          guideLine: otherCenterX,
          type: 'center-x'
        });
      }
      
      // ========== Y축 스냅 포인트 ==========
      
      // 1. 위 → 위 (Top-to-Top Alignment)
      const topToTopDist = Math.abs(currentTop - otherTop);
      if (topToTopDist < SNAP_THRESHOLD) {
        ySnapPoints.push({ 
          targetX: otherTop,  // Y좌표이지만 targetX 필드 사용
          distance: topToTopDist, 
          guideLine: otherTop,
          type: 'top-to-top'
        });
      }
      
      // 2. 아래 → 아래 (Bottom-to-Bottom Alignment)
      const bottomToBottomDist = Math.abs(currentBottom - otherBottom);
      if (bottomToBottomDist < SNAP_THRESHOLD) {
        ySnapPoints.push({ 
          targetX: otherBottom - NOTE_HEIGHT,  // ✅ 아래를 맞추기 위해 NOTE_HEIGHT만큼 뺌
          distance: bottomToBottomDist, 
          guideLine: otherBottom,
          type: 'bottom-to-bottom'
        });
      }
      
      // 3. 위 → 아래 붙이기 (Attach Top to Bottom)
      const topToBottomDist = Math.abs(currentTop - otherBottom);
      if (topToBottomDist < SNAP_THRESHOLD) {
        ySnapPoints.push({ 
          targetX: otherBottom + ATTACH_SPACING,  // ✅ 다른 포스트잇 아래에 딱 붙임
          distance: topToBottomDist, 
          guideLine: otherBottom,
          type: 'attach-top-to-bottom'
        });
      }
      
      // 4. 아래 → 위 붙이기 (Attach Bottom to Top)
      const bottomToTopDist = Math.abs(currentBottom - otherTop);
      if (bottomToTopDist < SNAP_THRESHOLD) {
        ySnapPoints.push({ 
          targetX: otherTop - NOTE_HEIGHT - ATTACH_SPACING,  // ✅ 다른 포스트잇 위에 붙임
          distance: bottomToTopDist, 
          guideLine: otherTop,
          type: 'attach-bottom-to-top'
        });
      }
      
      // 5. 중앙 → 중앙 (Center Alignment)
      const centerYDist = Math.abs(currentCenterY - otherCenterY);
      if (centerYDist < SNAP_THRESHOLD) {
        ySnapPoints.push({ 
          targetX: otherCenterY - NOTE_HEIGHT / 2,  // ✅ 중앙을 맞춤
          distance: centerYDist, 
          guideLine: otherCenterY,
          type: 'center-y'
        });
      }
    });
    
    // 가장 가까운 X축 스냅 포인트 적용
    if (xSnapPoints.length > 0) {
      xSnapPoints.sort((a, b) => a.distance - b.distance);
      const closest = xSnapPoints[0];
      nx = closest.targetX;  // ✅ 계산된 최종 X 좌표 사용
      snappedX = closest.guideLine;
      
      // 디버그 로그
      console.log(`[Snap X] ${closest.type}: x=${x} → nx=${nx} (distance: ${closest.distance.toFixed(1)}px)`);
    }
    
    // 가장 가까운 Y축 스냅 포인트 적용
    if (ySnapPoints.length > 0) {
      ySnapPoints.sort((a, b) => a.distance - b.distance);
      const closest = ySnapPoints[0];
      ny = closest.targetX;  // ✅ targetX 필드에 Y 좌표 저장되어 있음
      snappedY = closest.guideLine;
      
      // 디버그 로그
      console.log(`[Snap Y] ${closest.type}: y=${y} → ny=${ny} (distance: ${closest.distance.toFixed(1)}px)`);
    }
    
    // 드래그 중일 때만 가이드라인 표시
    if (isDragging) {
      setSnapGuides({ x: snappedX, y: snappedY });
    } else {
      setSnapGuides({});
      
      // 최종 위치 로그 (드래그 종료 시)
      if (snappedX !== undefined || snappedY !== undefined) {
        console.log(`[Snap Final] Position: (${nx}, ${ny})`);
      }
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
