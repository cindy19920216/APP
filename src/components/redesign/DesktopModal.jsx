"use client";

import React from 'react';

export default function DesktopModal({ onClose, children, maxWidth = 640 }) {
  return (
    <div style={S.backdrop} onClick={onClose}>
      <div style={{ ...S.dialog, maxWidth }} onClick={(e) => e.stopPropagation()}>
        <button style={S.closeBtn} onClick={onClose} aria-label="닫기">
          <i className="ti ti-x" />
        </button>
        {children}
      </div>
    </div>
  );
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, background: 'rgba(5,5,10,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 24,
  },
  dialog: {
    position: 'relative', width: '100%', maxHeight: '85vh',
    background: '#0f1117', borderRadius: 16, border: '0.5px solid #1e1e28',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 1,
    width: 30, height: 30, borderRadius: '50%', border: 'none',
    background: '#181820', color: '#888', fontSize: 15,
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
};
