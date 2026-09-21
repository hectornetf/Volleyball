import React, { useState, useEffect } from 'react';
import { UserCircle, Search, Check, Link as LinkIcon, RefreshCw, Sparkles, Trash2, Save, Loader2, Shuffle, BarChart3, History, TrendingUp } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores, updateJogador } from '../services/jogadorService';
import { carregarHistoricoTimes } from '../services/teamDrawService';
import { montarPainelEstatisticas, idsJogadoresDoTime, confrontosDoSorteio } from '../utils/estatisticasUtils';
import Avatar from '../components/Avatar';
import { gerarAvatarAleatorio } from '../utils/avatarUtils';

const formatarData = (iso) => {
  const [a, m, d] = (iso || '').split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso || '—';
};

// Mini-gráfico de evolução da força estimada do atleta.
const Sparkline = ({ serie }) => {
  if (!serie || serie.length < 2) return <span className="text-slate-600 text-[10px] font-bold">—</span>;
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const range = max - min || 1;
  const pontos = serie.map((v, i) => `${(i / (serie.length - 1)) * 40},${16 - ((v - min) / range) * 12}`).join(' ');
  const tendencia = serie[serie.length - 1] - serie[0];
  return (
    <svg width="40" height="18" viewBox="0 0 40 18" className="shrink-0">
      <polyline
        points={pontos}
        fill="none"
        stroke={tendencia > 0.05 ? '#34d399' : tendencia < -0.05 ? '#f87171' : '#94a3b8'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default function MeuPerfilPage() {
  const { activeGroupId } = useSession();
  const [jogadores, setJogadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meuId, setMeuId] = useState(null);
  const [busca, setBusca] = useState('');
  const [avatarSel, setAvatarSel] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [toast, setToast] = useState('');
  const [historicoTimes, setHistoricoTimes] = useState([]);

  const storageKey = `voleizin_jogador_${activeGroupId}`;

  const mostrarToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    if (!activeGroupId) return;
    const salvo = localStorage.getItem(storageKey);
    if (salvo) setMeuId(salvo);

    const unsub = subscribeJogadores(activeGroupId, (list) => {
      setJogadores(list);
      setLoading(false);
    });
    return () => unsub();
  }, [activeGroupId, storageKey]);

  const jogadorAtual = jogadores.find((j) => j.id === meuId) || null;

  useEffect(() => {
    if (!activeGroupId || !meuId) return;
    let ativo = true;
    carregarHistoricoTimes(activeGroupId).then((historico) => {
      if (ativo) setHistoricoTimes(historico);
    });
    return () => { ativo = false; };
  }, [activeGroupId, meuId]);

  const painelItem =
    montarPainelEstatisticas(jogadores, historicoTimes).find((p) => p.jogador.id === jogadorAtual?.id) || {
      jogos: 0,
      vitorias: 0,
      aproveitamento: 0,
      presencas: Number(jogadorAtual?.historicoPresencas) || 0,
      forca: Number(jogadorAtual?.nivel) || 3,
      historicoSuficiente: false,
      serie: [],
      evolucao: 0,
    };

  const presencasRecentes = Object.entries(jogadorAtual?.presencas || {})
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8);

  const partidasRecentes = historicoTimes
    .filter((sorteio) => (sorteio.times || []).some((t) => idsJogadoresDoTime(t).includes(jogadorAtual?.id)))
    .map((sorteio) => {
      const times = sorteio.times || [];
      const idx = times.findIndex((t) => idsJogadoresDoTime(t).includes(jogadorAtual.id));
      const confrontos = confrontosDoSorteio(sorteio) || [];
      const vitorias = confrontos
        .filter((c) => c.a === idx).reduce((s, c) => s + (Number(c.vitoriasA) || 0), 0)
        + confrontos.filter((c) => c.b === idx).reduce((s, c) => s + (Number(c.vitoriasB) || 0), 0);
      const derrotas = confrontos
        .filter((c) => c.a === idx).reduce((s, c) => s + (Number(c.vitoriasB) || 0), 0)
        + confrontos.filter((c) => c.b === idx).reduce((s, c) => s + (Number(c.vitoriasA) || 0), 0);
      return { data: sorteio.data, dia: sorteio.dia, time: `Time ${idx + 1}`, vitorias, derrotas };
    })
    .slice(0, 8);

  const tendencia = painelItem.evolucao;

  useEffect(() => {
    if (!jogadorAtual) return;
    if (jogadorAtual.avatar) setAvatarSel(jogadorAtual.avatar);
    else setAvatarSel((prev) => prev || gerarAvatarAleatorio());
  }, [meuId, jogadores]);

  const escolherJogador = (id) => {
    localStorage.setItem(storageKey, id);
    setMeuId(id);
    setAvatarSel('');
    setBusca('');
  };

  const trocarJogador = () => {
    localStorage.removeItem(storageKey);
    setMeuId(null);
    setAvatarSel('');
    setUrlInput('');
  };

  const salvar = async (url) => {
    if (!jogadorAtual) return;
    setSalvando(true);
    try {
      await updateJogador(jogadorAtual.id, { avatar: (url ?? avatarSel).trim() }, activeGroupId);
      if (url !== undefined) setAvatarSel(url);
      setUrlInput('');
      mostrarToast((url ?? avatarSel).trim() ? 'Avatar salvo com sucesso!' : 'Avatar removido.');
    } catch (e) {
      mostrarToast('Erro ao salvar avatar');
      alert('Erro ao salvar avatar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 font-bold">
        Carregando jogadores...
      </div>
    );
  }

  // ── Etapa 1: escolher quem é você ──────────────────────────────────────────
  if (!jogadorAtual) {
    const ativos = jogadores.filter((j) => j.status === 'Ativo');
    const filtrados = ativos.filter((j) => j.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-bold border border-cyan-500/20 mb-3">
            <UserCircle className="w-4 h-4" />
            <span>Meu Perfil</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Quem é você?</h1>
          <p className="text-slate-400 text-sm mt-1">
            Escolha o seu nome na lista para personalizar seu avatar. Fica salvo só neste aparelho.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar seu nome..."
            className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtrados.map((j) => (
            <button
              key={j.id}
              onClick={() => escolherJogador(j.id)}
              className="flex items-center space-x-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-3 text-left transition-all"
            >
              <Avatar jogador={j} size={44} />
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{j.nome}</div>
                <div className="text-[11px] text-slate-500 font-semibold">
                  {j.tipo || 'AVULSO'} • Nível {j.nivel || 3}
                </div>
              </div>
            </button>
          ))}
          {filtrados.length === 0 && (
            <div className="col-span-full text-center text-slate-500 text-sm py-8 italic">
              Nenhum jogador ativo encontrado.
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Etapa 2: personalizar avatar ───────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center gap-5">
        <Avatar jogador={{ ...jogadorAtual, avatar: avatarSel }} size={96} className="ring-4 ring-cyan-500/20" />
        <div className="text-center sm:text-left">
          <div className="text-[11px] uppercase tracking-wider font-bold text-cyan-400">Meu Perfil</div>
          <h1 className="text-2xl font-black text-white">{jogadorAtual.nome}</h1>
          <p className="text-slate-400 text-sm">
            {jogadorAtual.tipo || 'AVULSO'} • Nível {jogadorAtual.nivel || 3} • {jogadorAtual.historicoPresencas || 0} presenças
          </p>
        </div>
        <button
          onClick={trocarJogador}
          className="sm:ml-auto flex items-center space-x-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 text-xs font-bold"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Trocar jogador</span>
        </button>
      </div>

      {/* Análise do jogador */}
      <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Análise do jogador</span>
          </h2>
          {!painelItem.historicoSuficiente && (
            <span className="text-[10px] font-extrabold uppercase text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
              histórico insuficiente
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {painelItem.historicoSuficiente
            ? 'Baseada nas partidas concluídas, presença e força estimada.'
            : 'Continue jogando para o sistema estimar sua força com confiança a partir de 8 partidas.'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Partidas</div>
            <div className="text-xl font-black text-white mt-1">{painelItem.jogos ? painelItem.jogos : '—'}</div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{painelItem.vitorias} vitória(s)</div>
          </div>
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Aproveitamento</div>
            <div className={`text-xl font-black mt-1 ${painelItem.aproveitamento >= 60 ? 'text-emerald-400' : painelItem.aproveitamento >= 40 ? 'text-cyan-300' : 'text-white'}`}>
              {painelItem.jogos ? `${painelItem.aproveitamento}%` : '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">de vitórias</div>
          </div>
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Presença</div>
            <div className="text-xl font-black text-white mt-1">{painelItem.presencas}</div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{painelItem.presencas === 1 ? 'presença' : 'presenças'}</div>
          </div>
          <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800">
            <div className="text-[10px] uppercase font-extrabold text-slate-500">Força estimada</div>
            <div className={`text-xl font-black mt-1 ${painelItem.historicoSuficiente ? 'text-cyan-300' : 'text-slate-600'}`}>
              {painelItem.historicoSuficiente ? `⭐ ${painelItem.forca.toFixed(1)}` : '—'}
            </div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{painelItem.jogos ? `${painelItem.jogos} de 8 partidas` : 'na criação → 3.0'}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-400 font-bold">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span>Evolução:</span>
          {painelItem.serie.length ? (
            <>
              <Sparkline serie={painelItem.serie} />
              <span className={tendencia > 0.05 ? 'text-emerald-400' : tendencia < -0.05 ? 'text-rose-400' : 'text-slate-500'}>
                {tendencia === 0 ? '0.0' : `${tendencia > 0 ? '+' : '−'}${Math.abs(tendencia).toFixed(1)} pts`}
              </span>
            </>
          ) : (
            <span className="text-slate-600">sem partidas suficientes ainda</span>
          )}
        </div>
      </div>

      {/* Histórico do jogador */}
      <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
        <h2 className="text-base font-extrabold text-white mb-4 flex items-center space-x-2">
          <History className="w-5 h-5 text-emerald-400" />
          <span>Histórico do jogador</span>
        </h2>

        <div className="mb-6">
          <h3 className="text-[11px] uppercase font-extrabold text-slate-500 mb-2 flex items-center space-x-2">
            <UserCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Presenças recentes</span>
          </h3>
          {presencasRecentes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Sem presenças registradas ainda.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {presencasRecentes.map(([data, status]) => (
                <div key={data} className="flex items-center justify-between py-2">
                  <span className="text-xs font-bold text-slate-300">{formatarData(data)}</span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                      status === 'Confirmado'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                    }`}
                  >
                    {status || '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-[11px] uppercase font-extrabold text-slate-500 mb-2 flex items-center space-x-2">
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>Partidas recentes</span>
          </h3>
          {partidasRecentes.length === 0 ? (
            <p className="text-xs text-slate-500 italic">Ainda não participou de partidas concluídas.</p>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {partidasRecentes.map((partida, i) => (
                <div key={`${partida.data}-${i}`} className="flex items-center justify-between py-2">
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-300">{formatarData(partida.data)} · {partida.dia || ''}</span>
                    <span className="text-[10px] text-slate-500 font-bold ml-2">{partida.time}</span>
                  </div>
                  <span className={`text-[10px] font-black ${
                    partida.vitorias === partida.derrotas
                      ? 'text-slate-400'
                      : partida.vitorias > partida.derrotas
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                  }`}>
                    {partida.vitorias}V · {partida.derrotas}D
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Autogerador de avatar aleatório */}
      <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
        <h2 className="text-base font-extrabold text-white mb-1 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Gerar avatar aleatório</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Toque quantas vezes quiser até gostar do resultado e depois salve.
        </p>
        <div className="flex items-center gap-5">
          <Avatar jogador={{ ...jogadorAtual, avatar: avatarSel }} size={84} />
          <button
            onClick={() => setAvatarSel(gerarAvatarAleatorio())}
            className="flex items-center space-x-2 bg-gradient-to-r from-violet-600 to-fuchsia-500 hover:from-violet-500 hover:to-fuchsia-400 text-white font-extrabold px-5 py-3 rounded-2xl shadow-lg shadow-violet-500/20 text-xs uppercase tracking-wider transition-all"
          >
            <Shuffle className="w-4 h-4" />
            <span>Gerar aleatório</span>
          </button>
        </div>
      </div>

      {/* Foto por link */}
      <div className="bg-slate-900/70 p-6 rounded-3xl border border-slate-800">
        <h2 className="text-base font-extrabold text-white mb-1 flex items-center space-x-2">
          <LinkIcon className="w-5 h-5 text-cyan-400" />
          <span>Usar uma foto por link</span>
        </h2>
        <p className="text-xs text-slate-500 mb-4">Cole o endereço (URL) de uma imagem da internet.</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://exemplo.com/minha-foto.jpg"
            className="flex-1 bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            onClick={() => urlInput.trim() && salvar(urlInput.trim())}
            disabled={!urlInput.trim() || salvando}
            className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-40 text-white font-extrabold px-5 py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center space-x-2"
          >
            {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{salvando ? 'Salvando...' : 'Usar esta foto'}</span>
          </button>
        </div>
      </div>

      {/* Ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => salvar()}
          disabled={salvando}
          className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-40 text-white font-extrabold px-6 py-3 rounded-2xl shadow-lg shadow-emerald-500/20 text-xs uppercase tracking-wider"
        >
          {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{salvando ? 'Salvando...' : 'Salvar avatar'}</span>
        </button>
        <button
          onClick={() => salvar('')}
          disabled={salvando}
          className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 text-xs font-bold"
        >
          <Trash2 className="w-4 h-4" />
          <span>Remover avatar</span>
        </button>
      </div>

      {/* Notificação de sucesso */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-emerald-500 text-white font-bold text-sm px-5 py-3 rounded-2xl shadow-2xl shadow-emerald-500/30">
          <Check className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}