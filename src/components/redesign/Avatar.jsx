"use client";

// ─────────────────────────────────────────────
//  Avatar.jsx  –  캐릭터 아바타 SVG
// ─────────────────────────────────────────────
import React from 'react';

const avatarMap = {
  grandpa: (
    <svg viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="23" cy="23" r="23" fill="#2a2060"/>
      <ellipse cx="23" cy="29" rx="13" ry="9" fill="#534AB7" opacity="0.4"/>
      <circle cx="23" cy="19" r="9" fill="#CFC9F4"/>
      <circle cx="19.5" cy="19" r="1.4" fill="#26215C"/>
      <circle cx="26.5" cy="19" r="1.4" fill="#26215C"/>
      <path d="M20.5 24 Q23 26 25.5 24" stroke="#8880c8" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <rect x="15" y="14" width="16" height="5" rx="2.5" fill="#534AB7" opacity="0.8"/>
      <rect x="11" y="16" width="4" height="3" rx="1.5" fill="#534AB7" opacity="0.5"/>
      <rect x="31" y="16" width="4" height="3" rx="1.5" fill="#534AB7" opacity="0.5"/>
      <path d="M17 15 Q23 12 29 15" stroke="#7F77DD" strokeWidth="1.2" fill="none"/>
    </svg>
  ),
  grandma: (
    <svg viewBox="0 0 46 46" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="23" cy="23" r="23" fill="#3d1535"/>
      <ellipse cx="23" cy="29" rx="13" ry="9" fill="#993556" opacity="0.4"/>
      <circle cx="23" cy="19" r="9" fill="#F4C0D1"/>
      <circle cx="19.5" cy="19" r="1.4" fill="#4B1528"/>
      <circle cx="26.5" cy="19" r="1.4" fill="#4B1528"/>
      <path d="M20.5 24 Q23 26 25.5 24" stroke="#cc6090" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <ellipse cx="19.5" cy="20.5" rx="2" ry="1.1" fill="#ffb0c8" opacity="0.5"/>
      <ellipse cx="26.5" cy="20.5" rx="2" ry="1.1" fill="#ffb0c8" opacity="0.5"/>
      <path d="M15 14 Q23 9 31 14 Q31 19 27 18 Q23 20 19 18 Q15 19 15 14Z" fill="#D4537E" opacity="0.85"/>
    </svg>
  ),
  daughter1: (
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="19" cy="19" r="19" fill="#043428"/>
      <ellipse cx="19" cy="24" rx="10" ry="7" fill="#0F6E56" opacity="0.4"/>
      <circle cx="19" cy="15" r="8" fill="#9FE1CB"/>
      <circle cx="16" cy="15" r="1.2" fill="#04342C"/>
      <circle cx="22" cy="15" r="1.2" fill="#04342C"/>
      <path d="M16.5 19 Q19 21 21.5 19" stroke="#0F6E56" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <ellipse cx="15" cy="17" rx="2" ry="1.2" fill="#b8f0e0" opacity="0.4"/>
      <ellipse cx="23" cy="17" rx="2" ry="1.2" fill="#b8f0e0" opacity="0.4"/>
      <path d="M12 12 Q19 8 26 12 L26 14 Q19 10 12 14Z" fill="#1D9E75" opacity="0.85"/>
    </svg>
  ),
  soninlaw1: (
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="19" cy="19" r="19" fill="#042450"/>
      <ellipse cx="19" cy="24" rx="10" ry="7" fill="#185FA5" opacity="0.4"/>
      <circle cx="19" cy="15" r="8" fill="#B5D4F4"/>
      <circle cx="16" cy="15" r="1.2" fill="#042C53"/>
      <circle cx="22" cy="15" r="1.2" fill="#042C53"/>
      <path d="M16.5 19 Q19 21 21.5 19" stroke="#185FA5" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <path d="M12 12 Q19 8 26 12 L25 14 Q19 10 13 14Z" fill="#378ADD" opacity="0.85"/>
      <rect x="12" y="12" width="14" height="3" rx="1.5" fill="#185FA5" opacity="0.6"/>
    </svg>
  ),
  daughter2: (
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="19" cy="19" r="19" fill="#3a2000"/>
      <ellipse cx="19" cy="24" rx="10" ry="7" fill="#854F0B" opacity="0.4"/>
      <circle cx="19" cy="15" r="8" fill="#FAC775"/>
      <circle cx="16" cy="15" r="1.2" fill="#412402"/>
      <circle cx="22" cy="15" r="1.2" fill="#412402"/>
      <path d="M16.5 19 Q19 21 21.5 19" stroke="#BA7517" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <ellipse cx="15.5" cy="17" rx="2" ry="1.2" fill="#ffe0a0" opacity="0.45"/>
      <ellipse cx="22.5" cy="17" rx="2" ry="1.2" fill="#ffe0a0" opacity="0.45"/>
      <path d="M12 12 Q19 8 26 12 Q26 16 23 15 Q19 17 15 15 Q12 16 12 12Z" fill="#EF9F27" opacity="0.85"/>
    </svg>
  ),
  soninlaw2: (
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="19" cy="19" r="19" fill="#142800"/>
      <ellipse cx="19" cy="24" rx="10" ry="7" fill="#3B6D11" opacity="0.4"/>
      <circle cx="19" cy="15" r="8" fill="#C0DD97"/>
      <circle cx="16" cy="15" r="1.2" fill="#173404"/>
      <circle cx="22" cy="15" r="1.2" fill="#173404"/>
      <path d="M16.5 19 Q19 21 21.5 19" stroke="#3B6D11" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <rect x="12" y="11" width="14" height="4" rx="2" fill="#639922" opacity="0.85"/>
    </svg>
  ),
  son: (
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="19" cy="19" r="19" fill="#031e40"/>
      <ellipse cx="19" cy="24" rx="10" ry="7" fill="#185FA5" opacity="0.4"/>
      <circle cx="19" cy="15" r="8" fill="#85B7EB"/>
      <circle cx="16" cy="15" r="1.2" fill="#042C53"/>
      <circle cx="22" cy="15" r="1.2" fill="#042C53"/>
      <path d="M16.5 19 Q19 21 21.5 19" stroke="#185FA5" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M13 12 Q19 8 25 12 L24 14 Q19 10 14 14Z" fill="#378ADD" opacity="0.85"/>
      <circle cx="16" cy="14" r="1.5" fill="#85B7EB" opacity="0.45"/>
      <circle cx="22" cy="14" r="1.5" fill="#85B7EB" opacity="0.45"/>
    </svg>
  ),
  baby: (
    <svg viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <circle cx="19" cy="19" r="19" fill="#400e0e"/>
      <ellipse cx="19" cy="25" rx="10" ry="7" fill="#A32D2D" opacity="0.35"/>
      <circle cx="19" cy="16" r="8" fill="#F7C1C1"/>
      <circle cx="16" cy="16" r="1.2" fill="#501313"/>
      <circle cx="22" cy="16" r="1.2" fill="#501313"/>
      <path d="M16.5 20 Q19 22 21.5 20" stroke="#c06060" strokeWidth="1" fill="none" strokeLinecap="round"/>
      <path d="M19 8 Q17 5 14 7 Q16 7 17 10" fill="#97C459" opacity="0.9"/>
      <path d="M19 8 Q21 5 24 7 Q22 7 21 10" fill="#97C459" opacity="0.9"/>
      <circle cx="19" cy="8" r="1.8" fill="#639922" opacity="0.85"/>
      <ellipse cx="14" cy="17.5" rx="2" ry="1.2" fill="#ff9090" opacity="0.3"/>
      <ellipse cx="24" cy="17.5" rx="2" ry="1.2" fill="#ff9090" opacity="0.3"/>
    </svg>
  ),
};

export default function Avatar({ id, size = 38 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {avatarMap[id] || null}
    </div>
  );
}
