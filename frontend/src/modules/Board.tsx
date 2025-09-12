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

  const onMove = (id: string, x: number, y: number) => {
    // simple magnet snap: if close (<20px) to another note center on x or y, align
    const threshold = 20;
    const current = notes.find(n=>n.id===id);
    let nx = x; let ny = y;
    if (current) {
      notes.filter(n=>n.id!==id).forEach(other => {
        if (Math.abs(other.x - nx) < threshold) nx = other.x; // vertical align
        if (Math.abs(other.y - ny) < threshold) ny = other.y; // horizontal align
      });
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, x: nx, y: ny } : n));
    send({ type: 'note.move', note: { id, x: nx, y: ny }});
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
        {notes.map(n => (
          <StickyNote key={n.id} note={n} onMove={onMove} onUpdateText={onUpdateText} editing={editingId===n.id} onEndEdit={onEndEdit} />
        ))}
      </div>
    </div>
  );
};
