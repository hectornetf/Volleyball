import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Users, Trophy, Calendar, Star, ArrowRightLeft, 
  CheckCircle2, Hash, Brain, Send, Swords
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores } from '../services/jogadorService';
import { carregarHistoricoTimes, concluirSorteio, salvarSorteio, subscribeSorteioAberto, trocarJogadoresDoSorteio } from '../services/teamDrawService';
import { criarEstatisticas, equilibraTimes, estatisticaJogador, gerarConfrontos, POSICOES_QUADRA, nomeDoTime } from '../utils/estatisticasUtils';
import Avatar from '../components/Avatar';
import PlayerFigure from '../components/PlayerFigure';

const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const diaAtual = () => dias[[6, 0, 1, 2, 3, 4, 5][new Date().getDay()]] || 'Segunda';

// Data do próximo jogo do dia em formato ISO yyyy-MM-dd (seguro como chave no Firestore,
// pois o caminho do campo não aceita '/'). Janela de 24h para acessar o jogo de ontem.
const descobrirProximaData = (nomeDia) => {
  const mapa = { Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, Sexta: 5, Sábado: 6, Domingo: 0 };
  const alvo = mapa[nomeDia] ?? 5;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let diff = (alvo - hoje.getDay() + 7) % 7;
  if (diff === 6) diff = -1;
  const prox = new Date(hoje);
  prox.setDate(hoje.getDate() + diff);
  const d = String(prox.getDate()).padStart(2, '0');
  const m = String(prox.getMonth() + 1).padStart(2, '0');
  return `${prox.getFullYear()}-${m}-${d}`;
};

const formatarData = (dataISO) => {
  const [a, m, d] = (dataISO || '').split('-');
  return a && m && d ? `${d}/${m}/${a}` : '';
};

export default function TimesPage() {
  const { activeGroupId } = useSession();
  const [dia, setDia] = useState(diaAtual);
  const [jogadores, setJogadores] = useState([]);
  const [sorteio, setSorteio] = useState(null);
  const [confrontos, setConfrontos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const jogadoresPorTime = POSICOES_QUADRA.length;
  const [selecao, setSelecao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const sorteioIdRef = useRef(null);

  useEffect(() => activeGroupId ? subscribeJogadores(activeGroupId, (dados) => { setJogadores(dados); setCarregando(false); }) : undefined, [activeGroupId]);
  useEffect(() => {
    if (!activeGroupId) return undefined;
    let ativo = true;
    carregarHistoricoTimes(activeGroupId)
      .then((dados) => { if (ativo) setHistorico(dados); })
      .catch(() => {});
    return () => { ativo = false; };
  }, [activeGroupId]);
  useEffect(() => activeGroupId ? subscribeSorteioAberto(activeGroupId, dia, (dados) => {
    setSorteio(dados);
    setSelecao(null);
    const novoId = dados?.id || null;
    if (!novoId) { sorteioIdRef.current = null; setConfrontos([]); return; }
    if (novoId === sorteioIdRef.current) return;
    sorteioIdRef.current = novoId;
    setConfrontos(dados?.confrontos?.length ? dados.confrontos.map((c) => ({ ...c })) : gerarConfrontos(dados?.times?.length || 0));
  }) : undefined, [activeGroupId, dia]);

  const dataJogo = descobrirProximaData(dia);

  const confirmados = useMemo(() => jogadores.filter((j) => j.presencas?.[dataJogo] === 'Confirmado'), [jogadores, dataJogo]);
  const quantidadeTimesPossiveis = Math.floor(confirmados.length / jogadoresPorTime);
  const jogadoresSemPosicoes = confirmados.filter((j) => !Array.isArray(j.posicoes) || j.posicoes.length === 0).length;
  const coberturaPosicoes = POSICOES_QUADRA.map((posicao) => ({
    ...posicao,
    disponiveis: confirmados.filter((j) => !Array.isArray(j.posicoes) || j.posicoes.length === 0 || j.posicoes.map(String).includes(posicao.id)).length,
  }));
  const posicoesSemCobertura = coberturaPosicoes.filter((posicao) => posicao.disponiveis < quantidadeTimesPossiveis);
  const estatisticas = useMemo(() => criarEstatisticas(historico), [historico]);
  const infoJogador = (jogador) => estatisticaJogador(jogador, estatisticas);
  const times = useMemo(() => (sorteio?.times || []).map((time) => time.jogadores.map((registro, indice) => {
    const id = typeof registro === 'string' ? registro : registro.id;
    return {
      ...(jogadores.find((j) => j.id === id) || { ...(typeof registro === 'string' ? { id } : registro), nome: 'Jogador removido', nivel: registro.nivelNoSorteio }),
      posicaoId: typeof registro === 'string' ? POSICOES_QUADRA[indice]?.id : registro.posicaoId || POSICOES_QUADRA[indice]?.id,
    };
  })), [sorteio, jogadores]);

  const vitoriasDoTime = (indice) => confrontos.reduce((soma, c) => soma + (c.a === indice ? Number(c.vitoriasA) || 0 : c.b === indice ? Number(c.vitoriasB) || 0 : 0), 0);
  const atualizarConfronto = (indice, campo, valor) => setConfrontos((atual) => atual.map((c, i) => i === indice ? { ...c, [campo]: valor.replace(/[^0-9]/g, '') } : c));

  const gerar = async () => {
    if (confirmados.length < jogadoresPorTime * 2) {
      alert(`Faltam atletas: são necessários pelo menos ${jogadoresPorTime * 2} confirmados para formar dois times de ${jogadoresPorTime}.`);
      return;
    }
    if (posicoesSemCobertura.length) {
      alert(`Faltam jogadores para cobrir as posições em ${quantidadeTimesPossiveis} time(s): ${posicoesSemCobertura.map((p) => `${p.nome} (${p.disponiveis}/${quantidadeTimesPossiveis})`).join(', ')}.`);
      return;
    }
    setSalvando(true);
    try {
      const dadosHistoricos = await carregarHistoricoTimes(activeGroupId);
      setHistorico(dadosHistoricos);
      const resultado = equilibraTimes(confirmados, dadosHistoricos);
      await salvarSorteio({ groupId: activeGroupId, dia, dataJogo, ...resultado });
    } catch (err) {
      alert(err.code === 'POSICOES_INSUFICIENTES'
        ? err.message
        : 'Não foi possível salvar o sorteio. Verifique sua conexão e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const concluir = async () => {
    setSalvando(true);
    try {
      await concluirSorteio(sorteio.id, confrontos, activeGroupId);
    } catch (_) {
      alert('Não foi possível concluir a rodada. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const selecionarJogador = async (local) => {
    if (!selecao) { setSelecao(local); return; }
    if (selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao) { setSelecao(null); return; }
    setSalvando(true);
    try {
      await trocarJogadoresDoSorteio(sorteio.id, selecao, local, activeGroupId);
    } catch (err) {
      alert(err.code === 'POSICAO_INCOMPATIVEL'
        ? err.message
        : 'Não foi possível alterar a escalação. Tente novamente.');
    } finally {
      setSalvando(false);
      setSelecao(null);
    }
  };

  const estaSelecionado = (local) => selecao && selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao;

  const whatsapp = () => {
    const texto = times.map((time, i) => `*${nomeDoTime(sorteio?.times?.[i], i)}*\n${time.map((j) => `- ${j.posicaoId ? `${POSICOES_QUADRA.find((p) => p.id === j.posicaoId)?.nome || `Posição ${j.posicaoId}`}: ` : ''}${j.nome} (Nível ${j.nivel || 3})`).join('\n')}`).join('\n\n');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`🏐 *VOLEIZIN: TIMES SORTEADOS*\n\n${texto}\n\nAcesse: https://voleizindoscria.vercel.app/`)}`, '_blank');
  };

  const poderes = sorteio?.diagnostico?.poderes || [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-3xl border border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center space-x-3">
            <Users className="w-7 h-7 text-cyan-400" />
            <span>Montar Times</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Sorteio inteligente: nível atual, resultados anteriores (nota de confiança) e variedade de parcerias.
          </p>
        </div>

        {carregando && (
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold">
            <span className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span>Carregando...</span>
          </div>
        )}
      </div>

      {/* Days Selector */}
      <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2 overflow-x-auto">
        <Calendar className="w-5 h-5 text-cyan-400 shrink-0 ml-1 mr-2" />
        {dias.map((item) => {
          const isActive = dia === item;
          return (
            <button
              key={item}
              onClick={() => setDia(item)}
              className={`px-4 py-2 rounded-xl font-extrabold text-xs transition-all shrink-0 flex flex-col items-center ${
                isActive
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{item}</span>
              <span className={`text-[9px] font-bold ${isActive ? 'text-white/80' : 'text-slate-500'}`}>{formatarData(descobrirProximaData(item))}</span>
            </button>
          );
        })}
      </div>

      {/* Config Card */}
      <div className="bg-slate-800/40 p-6 rounded-3xl border border-slate-700/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-white text-base font-black">Formação 6 × 6</h2>
            <p className="text-slate-400 text-xs mt-1">Cada equipe terá uma vaga para cada posição da quadra.</p>
          </div>
          <span className="bg-slate-900 text-cyan-300 font-black text-lg px-4 py-2 rounded-xl">6 posições</span>
        </div>
        <p className="text-cyan-100 text-xs leading-5 mt-4">
          {confirmados.length} confirmados: {quantidadeTimesPossiveis} time(s) completo(s)
          {confirmados.length % jogadoresPorTime ? ` e ${confirmados.length % jogadoresPorTime} reserva(s)` : ''}.
          A quadra segue as posições 4 · 6 · 2 na frente e 5 · 1 · 3 atrás; o sorteio equilibra os níveis e evita repetir parcerias.
        </p>
        {jogadoresSemPosicoes > 0 && <p className="text-amber-300 text-xs mt-2">{jogadoresSemPosicoes} atleta(s) sem posições cadastradas serão considerados aptos a qualquer vaga até atualizar o cadastro.</p>}
        {quantidadeTimesPossiveis > 0 && (
          <p className={`text-xs mt-3 ${posicoesSemCobertura.length ? 'text-rose-300' : 'text-emerald-300'}`}>
            {posicoesSemCobertura.length
              ? `Cobertura insuficiente: ${posicoesSemCobertura.map((p) => `${p.nome} ${p.disponiveis}/${quantidadeTimesPossiveis}`).join(' · ')}`
              : 'Há jogadores disponíveis para cobrir todas as posições.'}
          </p>
        )}
        <button
          onClick={gerar}
          disabled={salvando || !!sorteio}
          className={`w-full py-4 rounded-2xl mt-5 font-black text-xs uppercase transition-all ${
            sorteio
              ? 'bg-slate-700 text-slate-300 cursor-not-allowed'
              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
          }`}
        >
          {salvando ? 'Salvando...' : sorteio ? 'Rodada aguardando conclusão' : 'Gerar times equilibrados'}
        </button>
      </div>

      <section className="bg-slate-900/70 p-5 rounded-3xl border border-slate-800" aria-labelledby="guia-posicoes">
        <h2 id="guia-posicoes" className="text-white text-sm font-black uppercase tracking-wide">Guia rápido das posições</h2>
        <p className="text-slate-400 text-xs mt-1 mb-4">Os números indicam o lugar no rodízio. A frente fica perto da rede; o fundo fica mais distante.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {POSICOES_QUADRA.map((posicao) => (
            <div key={posicao.id} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3">
              <p className="text-cyan-300 text-xs font-black">{posicao.id} · {posicao.nome}</p>
              <p className="text-slate-300 text-[11px] leading-4 mt-1">{posicao.descricao}</p>
            </div>
          ))}
        </div>
      </section>

      {sorteio && (
        <div>
          {/* Aviso de edição + WhatsApp + diagnóstico */}
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-indigo-200 text-xs font-bold flex items-center space-x-2">
              <ArrowRightLeft className="w-4 h-4 shrink-0" />
              <span>Para ajustar: toque em um jogador e depois no atleta com quem deseja trocar. As equipes manterão a mesma quantidade e as trocas respeitarão as posições cadastradas.</span>
            </p>
            <button
              onClick={whatsapp}
              className="bg-[#25D366] hover:bg-[#1ebe5b] text-white font-black text-xs uppercase px-5 py-3 rounded-2xl flex items-center space-x-2 w-full sm:w-auto justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
              <span>Enviar escalação</span>
            </button>
          </div>
          {sorteio.diagnostico?.repeticaoTotal !== undefined && (
            <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/40 mb-4 flex items-center space-x-3">
              <Hash className="w-4 h-4 text-cyan-400 shrink-0" />
              <p className="text-slate-300 text-[10px] font-bold">
                Parcerias repetidas na rodada: {sorteio.diagnostico.repeticaoTotal} · Trocas de variedade: {sorteio.diagnostico.variedadeAplicada || 0} · Atletas com histórico: {sorteio.diagnostico.jogadoresComHistorico}
              </p>
            </div>
          )}

          {/* Times */}
          {times.map((time, indice) => (
            <div key={indice} className="bg-slate-800/60 rounded-3xl border border-slate-700/40 mb-4 overflow-hidden">
              <div className="p-4 bg-cyan-500/10 flex flex-col sm:flex-row justify-between gap-1">
                <span className="text-cyan-300 font-black text-xs uppercase">{nomeDoTime(sorteio?.times?.[indice], indice)} · {time.length} atletas</span>
                <span className="text-cyan-200 text-xs font-bold">Poder {poderes[indice] ?? '—'} · V {vitoriasDoTime(indice)}</span>
              </div>
              <div className={time.some((j) => j.posicaoId) ? 'p-2 sm:p-3 bg-cyan-950/40 border-x-2 border-b-2 border-white/70' : 'p-4'}>
                {time.some((j) => j.posicaoId) && (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-1.5 h-8 rounded-full bg-blue-500 shadow-sm shadow-blue-300/50" />
                      <span
                        aria-label="Rede de vôlei"
                        className="relative flex-1 h-8 border-y-2 border-white/70"
                        style={{
                          backgroundImage: 'linear-gradient(rgba(255,255,255,.45) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.45) 1px, transparent 1px)',
                          backgroundSize: '8px 6px',
                        }}
                      >
                        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-slate-950/80 text-white text-[8px] font-black uppercase tracking-[.25em] text-center">Rede</span>
                      </span>
                      <span className="w-1.5 h-8 rounded-full bg-blue-500 shadow-sm shadow-blue-300/50" />
                    </div>
                    <p className="text-center text-cyan-200 text-[9px] font-black uppercase tracking-widest mb-2">Frente · perto da rede</p>
                  </>
                )}
                <div className={time.some((j) => j.posicaoId) ? 'grid grid-cols-3 gap-2' : ''}>
                {time.slice(0, 3).map((j, posicao) => {
                  const local = { tipo: 'time', indice, posicao };
                  const isSel = estaSelecionado(local);
                  const stat = infoJogador(j);
                  const role = POSICOES_QUADRA.find((item) => item.id === j.posicaoId);
                  return (
                    <button
                      key={j.id}
                      disabled={salvando}
                      onClick={() => selecionarJogador(local)}
                      className={`w-full text-left p-2 sm:p-3 rounded-xl transition-all ${
                        isSel
                          ? 'bg-indigo-500 border border-indigo-300 text-white'
                          : 'bg-slate-900/70 hover:bg-slate-900 border border-white/5'
                      }`}
                    >
                      <span className="flex flex-col items-center gap-1 text-center min-h-24 justify-center">
                        {role && <span className="text-[9px] uppercase font-black text-cyan-300">{role.id} · {role.nome}</span>}
                        <PlayerFigure posicaoId={role?.id || String(posicao + 1)} />
                        <span className="text-slate-100 font-bold text-[10px] sm:text-xs break-words">{j.nome}</span>
                        {role && <span className="text-slate-400 text-[8px] leading-3">{role.descricao}</span>}
                        <span className="text-amber-400 text-[10px]">★ {j.nivel || 3}</span>
                        {!stat.historicoSuficiente && <span className="text-amber-300/90 text-[8px]">histórico insuficiente</span>}
                      </span>
                    </button>
                  );
                })}
                </div>
                {time.some((j) => j.posicaoId) && (
                  <p className="text-center text-amber-100/80 text-[9px] font-black uppercase tracking-widest mb-2">Fundo · defesa e recepção</p>
                )}
                <div className={time.some((j) => j.posicaoId) ? 'grid grid-cols-3 gap-2' : ''}>
                {time.slice(3).map((j, indiceFundo) => {
                  const posicao = indiceFundo + 3;
                  const local = { tipo: 'time', indice, posicao };
                  const isSel = estaSelecionado(local);
                  const stat = infoJogador(j);
                  const role = POSICOES_QUADRA.find((item) => item.id === j.posicaoId);
                  return (
                    <button
                      key={j.id}
                      disabled={salvando}
                      onClick={() => selecionarJogador(local)}
                      className={`w-full text-left p-2 sm:p-3 rounded-xl transition-all ${
                        isSel
                          ? 'bg-indigo-500 border border-indigo-300 text-white'
                          : 'bg-slate-900/70 hover:bg-slate-900 border border-white/5'
                      }`}
                    >
                      <span className="flex flex-col items-center gap-1 text-center min-h-24 justify-center">
                        {role && <span className="text-[9px] uppercase font-black text-cyan-300">{role.id} · {role.nome}</span>}
                        <PlayerFigure posicaoId={role?.id || String(posicao + 1)} />
                        <span className="text-slate-100 font-bold text-[10px] sm:text-xs break-words">{j.nome}</span>
                        {role && <span className="text-slate-400 text-[8px] leading-3">{role.descricao}</span>}
                        <span className="text-amber-400 text-[10px]">★ {j.nivel || 3}</span>
                        {!stat.historicoSuficiente && <span className="text-amber-300/90 text-[8px]">histórico insuficiente</span>}
                      </span>
                    </button>
                  );
                })}
                </div>
              </div>
            </div>
          ))}

          {/* Placar por confronto */}
          {confrontos.length > 0 && (
            <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-3xl mb-4">
              <h3 className="text-indigo-300 text-xs font-black uppercase flex items-center space-x-2">
                <Swords className="w-4 h-4" />
                <span>Placar por confronto</span>
              </h3>
              <p className="text-indigo-200 text-[10px] font-bold mt-1 mb-3">Registre quem jogou contra quem (todos contra todos).</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {confrontos.map((confronto, indice) => (
                  <div key={`${confronto.a}-${confronto.b}`} className="bg-slate-900/40 p-3 rounded-xl flex items-center justify-between gap-2">
                    <span className="text-slate-200 text-[10px] font-black shrink-0">{nomeDoTime(sorteio?.times?.[confronto.a], confronto.a)}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={confronto.vitoriasA}
                        onChange={(e) => atualizarConfronto(indice, 'vitoriasA', e.target.value)}
                        className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                      <span className="text-slate-500 font-black">×</span>
                      <input
                        type="number"
                        min="0"
                        value={confronto.vitoriasB}
                        onChange={(e) => atualizarConfronto(indice, 'vitoriasB', e.target.value)}
                        className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <span className="text-slate-200 text-[10px] font-black shrink-0">{nomeDoTime(sorteio?.times?.[confronto.b], confronto.b)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reservas */}
          {(sorteio?.reservas || []).length > 0 && (
            <div className="bg-amber-500/10 p-4 rounded-2xl mb-4 border border-amber-500/20">
              <p className="text-amber-300 text-xs font-black mb-2 flex items-center space-x-2">
                <Star className="w-4 h-4" />
                <span>RESERVAS — toque para trocar</span>
              </p>
              {sorteio.reservas.map((registro, indice) => {
                const id = typeof registro === 'string' ? registro : registro.id;
                const local = { tipo: 'reserva', indice };
                const isSel = estaSelecionado(local);
                const jogador = jogadores.find((j) => j.id === id) || { id, nome: 'Jogador' };
                const stat = infoJogador(jogador);
                return (
                  <button
                    key={`reserva-${id}-${indice}`}
                    disabled={salvando}
                    onClick={() => selecionarJogador(local)}
                    className={`w-full text-left p-3 rounded-xl mb-1 font-bold text-xs transition-all ${
                      isSel
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-900/40 text-slate-100 hover:bg-slate-900/70'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Avatar jogador={jogador} size={24} />
                      <span>{jogador.nome}{!stat.historicoSuficiente && <span className="text-amber-300/90 text-[9px] ml-1">· histórico insuficiente</span>}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Concluir rodada */}
          <button
            onClick={concluir}
            disabled={salvando}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-2xl text-white font-black text-xs uppercase flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            {salvando ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            <span>{salvando ? 'Salvando...' : 'Concluir rodada e ensinar o algoritmo'}</span>
          </button>
        </div>
      )}

      {!sorteio && !carregando && (
        <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-slate-800">
          <Brain className="w-10 h-10 text-cyan-400 mx-auto mb-3 opacity-50" />
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Aguardando sorteio</h3>
          <p className="text-slate-400 text-xs mt-2 max-w-sm mx-auto">
            {confirmados.length > 0
              ? `${confirmados.length} jogadores confirmados em ${dia} (${formatarData(dataJogo)}). Clique em "Gerar times equilibrados" para criar a rodada.`
              : `Nenhum jogador confirmado em ${dia} (${formatarData(dataJogo)}). Marque as presenças antes de sortear.`}
          </p>
        </div>
      )}

      {/* Resumo de confirmados */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Hash className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-extrabold text-white">
            {confirmados.length} Jogadores Confirmados para {dia} ({formatarData(dataJogo)})
          </span>
        </div>
        {sorteio && (
          <Trophy className="w-5 h-5 text-emerald-400" />
        )}
      </div>

    </div>
  );
}