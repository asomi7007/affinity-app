import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';

interface Props {
  note: { id: string; text: string; x: number; y: number; color: string };
  onMove: (id: string, x: number, y: number) => void;
  onUpdateText: (id: string, text: string) => void;
  editing?: boolean;
  onEndEdit?: (id: string) => void;
}

export const StickyNote: React.FC<Props> = ({ note, onMove, onUpdateText, editing: externalEditing, onEndEdit }) => {
  const x = useMotionValue(note.x);
  const y = useMotionValue(note.y);
  const [internalEditing, setInternalEditing] = useState(false);
  const editing = externalEditing ?? internalEditing;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // sync external updates (e.g. from other users)
  useEffect(() => { x.set(note.x); y.set(note.y); }, [note.x, note.y, x, y]);

  const handleDragEnd = (_: any, info: { point: { x: number; y: number } }) => {
    // container relative correction handled by absolute positions because Board container is positioned
    const newX = info.point.x - 160; // approximate panel padding offset compensation
    const newY = info.point.y - 140;
    onMove(note.id, newX, newY);
  };

  const autoResize = () => {
    const el = textareaRef.current; if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 400) + 'px';
  };

  useEffect(() => { if (editing) { textareaRef.current?.focus(); autoResize(); } }, [editing]);

  const onBlur = () => { if (!externalEditing) setInternalEditing(false); onEndEdit?.(note.id); };
  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdateText(note.id, e.target.value);
    autoResize();
  };

  const onDoubleClick = () => { if (!externalEditing) setInternalEditing(true); };

  return (
    <motion.div
      style={{
        position:'absolute',
        x, y,
        width: 160,
        minHeight: 110,
        background: note.color,
        borderRadius: 14,
        padding: '10px 12px 14px',
        boxShadow:'0 6px 18px -4px rgba(0,0,0,0.35), 0 2px 4px rgba(0,0,0,0.2)',
        cursor: editing ? 'text' : 'grab',
        userSelect: editing ? 'text' : 'none',
        display:'flex',
        outline: editing ? '2px solid rgba(255,255,255,0.6)' : 'none',
        filter: editing ? 'drop-shadow(0 0 6px rgba(255,255,255,0.5))' : 'none',
        zIndex: editing ? 999 : undefined
      }}
      layout
      drag={!editing}
      dragMomentum={false}
      dragElastic={0.18}
      whileDrag={{ scale: 1.06, rotate:0.5, boxShadow:'0 14px 34px -10px rgba(0,0,0,0.55)' }}
      transition={{ type:'spring', stiffness:260, damping:20 }}
      onDragEnd={handleDragEnd}
      onDoubleClick={onDoubleClick}
    >
      {editing ? (
        <textarea
          ref={textareaRef}
          defaultValue={note.text}
          onChange={onChange}
          onBlur={onBlur}
          style={{
            flex:1,
            border:'none',
            resize:'none',
            outline:'none',
            background:'transparent',
            font:'14px/1.4 "Segoe UI", system-ui, sans-serif',
            color:'#222',
            fontWeight:500
          }}
        />
      ) : (
        <div style={{
          font:'14px/1.4 "Segoe UI", system-ui, sans-serif',
          whiteSpace:'pre-wrap',
          width:'100%',
          color:'#222',
          fontWeight:500
        }}>
          {note.text || '더블클릭하여 입력'}
        </div>
      )}
    </motion.div>
  );
};
