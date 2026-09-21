import React, { useState } from 'react';
import { resolverAvatar, parseAvatar, iniciais, corDoNome } from '../utils/avatarUtils';

export default function Avatar({ jogador, nome, size = 40, className = '' }) {
  const info = parseAvatar(resolverAvatar(jogador));
  const label = nome || jogador?.nome || '';
  const [erro, setErro] = useState(false);
  const style = { width: size, height: size };

  if (info.tipo === 'gerado') {
    return (
      <div
        style={{
          ...style,
          background: `linear-gradient(135deg, ${info.fundo.a}, ${info.fundo.b})`,
          fontSize: Math.round(size * 0.58),
        }}
        title={label}
        className={`rounded-full flex items-center justify-center shrink-0 border border-white/10 ${className}`}
      >
        <span style={{ lineHeight: 1 }}>{info.cara}</span>
      </div>
    );
  }

  if (info.tipo === 'url' && !erro) {
    return (
      <img
        src={info.url}
        alt={label}
        title={label}
        style={style}
        onError={() => setErro(true)}
        className={`rounded-full object-cover bg-slate-800 border border-slate-700 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={{ ...style, fontSize: Math.round(size * 0.38) }}
      title={label}
      className={`rounded-full flex items-center justify-center font-black text-white shrink-0 ${corDoNome(label)} ${className}`}
    >
      {iniciais(label)}
    </div>
  );
}