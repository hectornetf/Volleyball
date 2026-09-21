// Autogerador de avatar aleatório, 100% local (sem depender de serviços externos).
// O campo `avatar` do jogador guarda um descritor curto no formato `gen|fundo|cara`.
// Também aceitamos uma URL de foto (compatibilidade) e vazio = sem avatar (iniciais).
const FUNDOS = [
  { a: '#f97316', b: '#f43f5e' },
  { a: '#8b5cf6', b: '#6366f1' },
  { a: '#06b6d4', b: '#3b82f6' },
  { a: '#10b981', b: '#14b8a6' },
  { a: '#f59e0b', b: '#ef4444' },
  { a: '#ec4899', b: '#8b5cf6' },
  { a: '#22c55e', b: '#84cc16' },
  { a: '#0ea5e9', b: '#6366f1' },
  { a: '#e11d48', b: '#7c3aed' },
  { a: '#14b8a6', b: '#0ea5e9' },
  { a: '#a855f7', b: '#ec4899' },
  { a: '#f43f5e', b: '#f59e0b' },
];

const CARAS = ['🦊', '🐱', '🐼', '🐸', '🐵', '🦁', '🐯', '🐨', '🐰', '🐷', '🐺', '🦝', '🐧', '🐤', '👾', '🤖', '👽', '🥷', '😎', '🤠', '🥸', '🥳', '😺', '🦄', '🐲', '🐻', '🐭', '🐹'];

export const gerarAvatarAleatorio = () => {
  const fundo = Math.floor(Math.random() * FUNDOS.length);
  const cara = Math.floor(Math.random() * CARAS.length);
  return `gen|${fundo}|${cara}`;
};

export const parseAvatar = (valor) => {
  const v = (valor || '').trim();
  if (v.startsWith('gen|')) {
    const [, iFundo, iCara] = v.split('|');
    const fundo = FUNDOS[Number(iFundo) % FUNDOS.length] || FUNDOS[0];
    const cara = CARAS[Number(iCara) % CARAS.length] || CARAS[0];
    return { tipo: 'gerado', fundo, cara };
  }
  if (v) return { tipo: 'url', url: v };
  return { tipo: 'vazio' };
};

const PALETA = ['bg-emerald-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-amber-600', 'bg-rose-600', 'bg-violet-600', 'bg-teal-600', 'bg-sky-600'];

export const resolverAvatar = (jogador) => {
  const valor = typeof jogador === 'string' ? jogador : jogador?.avatar;
  return (valor || '').trim();
};

export const iniciais = (nome) => {
  const partes = String(nome || '?').trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
};

export const corDoNome = (nome) => {
  const texto = String(nome || '');
  let hash = 0;
  for (let i = 0; i < texto.length; i += 1) hash = (hash * 31 + texto.charCodeAt(i)) % 997;
  return PALETA[hash % PALETA.length];
};