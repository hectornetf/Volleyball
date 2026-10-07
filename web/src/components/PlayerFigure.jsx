import React, { useId } from 'react';

const coresCamisa = {
  4: '#dc2626',
  6: '#facc15',
  2: '#16a34a',
  5: '#7e22ce',
  1: '#ea580c',
  3: '#2563eb',
};

export default function PlayerFigure({ posicaoId }) {
  const camisa = coresCamisa[posicaoId] || '#0891b2';
  const textoCamisa = posicaoId === '6' ? '#111827' : '#ffffff';
  const gradientId = `shirt-${useId().replaceAll(':', '')}`;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 120"
      className="w-[4.5rem] h-[5.5rem] shrink-0 drop-shadow-md"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".2" />
          <stop offset=".45" stopColor={camisa} />
          <stop offset="1" stopColor="#020617" stopOpacity=".22" />
        </linearGradient>
        <linearGradient id="skin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#fbd2ac" />
          <stop offset="1" stopColor="#c77d54" />
        </linearGradient>
      </defs>
      <ellipse cx="50" cy="114" rx="34" ry="4" fill="#020617" fillOpacity=".35" />
      <path d="M39 18c-2-9 3-15 12-15 10 0 15 8 10 17l-4 9H41Z" fill="#171717" />
      <path d="M59 13c10 2 10 11 5 15l-8-2Z" fill="#171717" />
      <path d="M42 19c1-8 5-12 10-12 7 0 10 5 9 12l-4 9H43Z" fill="url(#skin)" />
      <path d="M43 25h15v14H43Z" fill="url(#skin)" />
      <path d="M31 35 20 40 11 60l8 5 13-14M69 35l11 5 9 20-8 5-13-14" fill="url(#skin)" stroke="#a85f3c" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m16 57 8 3 5 12-6 4-11-13ZM84 57l-8 3-5 12 6 4 11-13" fill="url(#skin)" stroke="#a85f3c" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M32 37Q50 29 68 37l8 28-8 9H32l-8-9Z" fill={`url(#${gradientId})`} stroke="#ffffff" strokeOpacity=".48" strokeWidth="1.5" />
      <path d="m26 67 48 0-4 20-13 5-7-10-7 10-13-5Z" fill="#111827" stroke="#334155" strokeWidth="1.5" />
      <path d="m39 87-9 6-11 13-7-3 12-20 12-4ZM61 87l9 6 11 13 7-3-12-20-12-4Z" fill="url(#skin)" stroke="#a85f3c" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m16 95 11 5-3 9-13-3ZM73 100l11-5 5 11-13 3Z" fill="#111827" stroke="#64748b" strokeWidth="2" />
      <path d="m10 105 13 2 2 4-19 0c-2-2 0-5 4-6ZM77 107l13-2c4 1 6 4 4 6H75Z" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m31 42 8 3M69 42l-8 3" stroke="#ffffff" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
      <text x="50" y="61" fill={textoCamisa} fontSize="22" fontWeight="900" textAnchor="middle">{posicaoId}</text>
    </svg>
  );
}
