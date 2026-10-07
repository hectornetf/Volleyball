import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores } from '../services/jogadorService';
import { carregarHistoricoTimes, concluirSorteio, salvarSorteio, subscribeSorteioAberto, trocarJogadoresDoSorteio } from '../services/teamDrawService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

export default function TimesScreen() {
  const insets = useSafeAreaInsets();
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
  useFocusEffect(React.useCallback(() => {
    setDia(diaAtual());
  }, []));

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
    if (confirmados.length < jogadoresPorTime * 2) return Alert.alert('Faltam atletas', `São necessários pelo menos ${jogadoresPorTime * 2} confirmados para formar dois times de ${jogadoresPorTime}.`);
    if (posicoesSemCobertura.length) return Alert.alert('Faltam posições', `Não há jogadores suficientes para cobrir em ${quantidadeTimesPossiveis} time(s): ${posicoesSemCobertura.map((p) => `${p.nome} (${p.disponiveis}/${quantidadeTimesPossiveis})`).join(', ')}.`);
    setSalvando(true);
    try {
      const dadosHistoricos = await carregarHistoricoTimes(activeGroupId);
      setHistorico(dadosHistoricos);
      const resultado = equilibraTimes(confirmados, dadosHistoricos);
      await salvarSorteio({ groupId: activeGroupId, dia, dataJogo, ...resultado });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert(
        err.code === 'POSICOES_INSUFICIENTES' ? 'Faltam posições' : 'Não foi possível salvar',
        err.code === 'POSICOES_INSUFICIENTES' ? err.message : 'Verifique sua conexão e tente novamente.'
      );
    } finally { setSalvando(false); }
  };
  const concluir = async () => { setSalvando(true); try { await concluirSorteio(sorteio.id, confrontos, activeGroupId); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) { Alert.alert('Não foi possível concluir', 'Tente novamente.'); } finally { setSalvando(false); } };
  const selecionarJogador = async (local) => {
    if (!selecao) { setSelecao(local); return; }
    if (selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao) { setSelecao(null); return; }
    setSalvando(true);
    try {
      await trocarJogadoresDoSorteio(sorteio.id, selecao, local, activeGroupId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      Alert.alert('Não foi possível alterar', err.code === 'POSICAO_INCOMPATIVEL' ? err.message : 'Tente novamente.');
    }
    finally { setSalvando(false); setSelecao(null); }
  };
  const estaSelecionado = (local) => selecao && selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao;
  const whatsapp = () => { const texto = times.map((time, i) => `*${nomeDoTime(sorteio?.times?.[i], i)}*\n${time.map((j) => `- ${j.posicaoId ? `${POSICOES_QUADRA.find((p) => p.id === j.posicaoId)?.nome || `Posição ${j.posicaoId}`}: ` : ''}${j.nome} (Nível ${j.nivel || 3})`).join('\n')}`).join('\n\n'); Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`🏐 *VOLEIZIN: TIMES SORTEADOS*\n\n${texto}`)}`).catch(() => Alert.alert('Erro', 'WhatsApp não instalado.')); };

  return <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
    <View style={{ marginTop: Math.max(insets.top, 20) }} className="flex-row justify-between items-center mb-7"><View><Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px]">Sorteio inteligente</Text><Text className="text-white text-3xl font-black mt-1">Montar <Text className="text-cyan-400">Times</Text></Text></View><FontAwesome5 name="brain" size={28} color="#22d3ee" /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ gap: 8 }}>{dias.map((item) => <TouchableOpacity key={item} onPress={() => setDia(item)} className={`px-4 py-2 rounded-xl items-center ${dia === item ? 'bg-cyan-500' : 'bg-slate-800'}`}><Text className="text-white text-xs font-bold">{item}</Text><Text className={`text-[8px] ${dia === item ? 'text-white/80' : 'text-slate-500'}`}>{formatarData(descobrirProximaData(item))}</Text></TouchableOpacity>)}</ScrollView>
    <View className="bg-slate-800/40 p-6 rounded-[32px] border border-white/5 mb-6">
      <View className="flex-row justify-between items-center">
        <View><Text className="text-white text-lg font-black">Formação 6 × 6</Text><Text className="text-slate-400 text-xs mt-1">Uma vaga para cada posição da quadra.</Text></View>
        <Text className="text-cyan-300 font-black text-lg bg-slate-900 px-3 py-2 rounded-xl">6 posições</Text>
      </View>
      <Text className="text-cyan-100 text-xs leading-5 mt-4">
        {confirmados.length} confirmados: {quantidadeTimesPossiveis} time(s) completo(s){confirmados.length % jogadoresPorTime ? ` e ${confirmados.length % jogadoresPorTime} reserva(s)` : ''}.
        {' '}Formação: 4 · 6 · 2 na frente e 5 · 1 · 3 atrás; o sorteio também equilibra os níveis e evita parcerias repetidas.
      </Text>
      {jogadoresSemPosicoes > 0 && <Text className="text-amber-300 text-xs mt-2">{jogadoresSemPosicoes} atleta(s) sem posições cadastradas serão considerados aptos a qualquer vaga até atualizar o cadastro.</Text>}
      {quantidadeTimesPossiveis > 0 && <Text className={`text-xs mt-3 ${posicoesSemCobertura.length ? 'text-rose-300' : 'text-emerald-300'}`}>
        {posicoesSemCobertura.length
          ? `Cobertura insuficiente: ${posicoesSemCobertura.map((p) => `${p.nome} ${p.disponiveis}/${quantidadeTimesPossiveis}`).join(' · ')}`
          : 'Há jogadores disponíveis para cobrir todas as posições.'}
      </Text>}
      <TouchableOpacity disabled={salvando || !!sorteio} onPress={gerar} className={`w-full py-4 rounded-2xl items-center mt-5 ${sorteio ? 'bg-slate-700' : 'bg-cyan-600'}`}>
        {salvando ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-xs uppercase">{sorteio ? 'Rodada aguardando conclusão' : 'Gerar times equilibrados'}</Text>}
      </TouchableOpacity>
    </View>
    <View className="bg-slate-900/70 p-5 rounded-[28px] border border-white/5 mb-6">
      <Text className="text-white text-sm font-black uppercase tracking-wide">Guia rápido das posições</Text>
      <Text className="text-slate-400 text-[10px] mt-1 mb-3">Os números indicam o lugar no rodízio. A frente fica perto da rede; o fundo fica mais distante.</Text>
      <View className="flex-row flex-wrap justify-between">
        {POSICOES_QUADRA.map((posicao) => <View key={posicao.id} className="w-[48%] bg-slate-950/70 border border-white/5 rounded-xl p-3 mb-2">
          <Text className="text-cyan-300 text-[10px] font-black">{posicao.id} · {posicao.nome}</Text>
          <Text className="text-slate-300 text-[9px] leading-4 mt-1">{posicao.descricao}</Text>
        </View>)}
      </View>
    </View>
    {carregando && <ActivityIndicator size="large" color="#22d3ee" />}
    {sorteio && <View>
      <View className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-5"><Text className="text-indigo-200 text-xs font-bold">Para ajustar: toque em um jogador e depois no atleta com quem deseja trocar. As equipes manterão a mesma quantidade e as trocas respeitarão as posições cadastradas.</Text></View>
      {sorteio.diagnostico?.repeticaoTotal !== undefined && <View className="bg-slate-800/40 p-3 rounded-2xl mb-5"><Text className="text-slate-300 text-[10px] font-bold">Parcerias repetidas na rodada: {sorteio.diagnostico.repeticaoTotal} · Trocas de variedade: {sorteio.diagnostico.variedadeAplicada || 0} · Atletas com histórico: {sorteio.diagnostico.jogadoresComHistorico}</Text></View>}
      <TouchableOpacity onPress={whatsapp} className="bg-[#25D366] py-4 rounded-2xl items-center mb-5"><Text className="text-white font-black text-xs uppercase">Enviar escalação</Text></TouchableOpacity>
      {times.map((time, indice) => {
        const temQuadra = time.some((j) => j.posicaoId);
        const renderJogador = (j, posicao) => {
            const local = { tipo: 'time', indice, posicao };
            const stat = infoJogador(j);
            const role = POSICOES_QUADRA.find((item) => item.id === j.posicaoId);
            return <TouchableOpacity key={j.id} disabled={salvando} onPress={() => selecionarJogador(local)} className={`p-2 rounded-xl mb-1 items-center justify-center ${temQuadra ? 'w-[32%] min-h-32' : 'w-full flex-row gap-2'} ${estaSelecionado(local) ? 'bg-indigo-500 border border-indigo-300' : 'bg-slate-900/70 border border-white/5'}`}>
              {role && <Text className="text-cyan-300 text-[8px] font-black uppercase text-center">{role.id} · {role.nome}</Text>}
              <PlayerFigure posicaoId={role?.id || String(posicao + 1)} />
              <Text className="text-slate-100 font-bold text-[10px] text-center">{j.nome}</Text>
              {role && <Text className="text-slate-400 text-[8px] leading-3 text-center">{role.descricao}</Text>}
              <Text className="text-amber-400 text-[9px]">★ {j.nivel || 3}</Text>
              {!stat.historicoSuficiente && <Text className="text-amber-300 text-[8px] text-center">histórico insuficiente</Text>}
            </TouchableOpacity>;
        };
        return <View key={indice} className="bg-slate-800/60 rounded-[28px] border border-white/5 mb-4 overflow-hidden">
          <View className="p-4 bg-cyan-500/10 flex-row justify-between">          <Text className="text-cyan-300 font-black">{nomeDoTime(sorteio?.times?.[indice], indice).toUpperCase()} · {time.length} ATLETAS</Text><Text className="text-cyan-200 text-xs font-bold">Poder {sorteio.diagnostico?.poderes?.[indice]} · V {vitoriasDoTime(indice)}</Text></View>
          <View className={temQuadra ? 'bg-cyan-950/40 p-2 border-x-2 border-b-2 border-white/70' : 'p-4'}>
            {temQuadra && <>
              <View className="flex-row items-center gap-2 mb-3">
                <View className="w-1.5 h-8 rounded-full bg-blue-500" />
                <View accessibilityLabel="Rede de vôlei" className="flex-1 h-8 border-y-2 border-white/70 overflow-hidden justify-center">
                  <View pointerEvents="none" className="absolute inset-0">
                    {Array.from({ length: 20 }, (_, i) => <View key={`vertical-${i}`} style={{ position: 'absolute', left: `${i * 5}%`, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />)}
                    {Array.from({ length: 4 }, (_, i) => <View key={`horizontal-${i}`} style={{ position: 'absolute', left: 0, right: 0, top: `${i * 33}%`, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />)}
                  </View>
                  <Text className="self-center px-2 bg-slate-900/80 text-white text-[8px] font-black uppercase tracking-widest">Rede</Text>
                </View>
                <View className="w-1.5 h-8 rounded-full bg-blue-500" />
              </View>
              <Text className="text-cyan-200 text-[9px] font-black uppercase tracking-widest text-center mb-2">Frente · perto da rede</Text>
            </>}
            <View className={temQuadra ? 'flex-row justify-between' : ''}>{time.slice(0, 3).map(renderJogador)}</View>
            {temQuadra && <View className="my-2">
              <Text className="text-amber-100/80 text-[9px] font-black uppercase tracking-widest text-center mt-2">Fundo · defesa e recepção</Text>
            </View>}
            <View className={temQuadra ? 'flex-row justify-between' : ''}>{time.slice(3).map((j, i) => renderJogador(j, i + 3))}</View>
          </View>
        </View>;
      })}
      {confrontos.length > 0 && <View className="bg-indigo-500/10 p-4 rounded-[28px] border border-indigo-500/20 mb-4">
        <Text className="text-indigo-300 text-xs font-black mb-1">PLACAR POR CONFRONTO</Text>
        <Text className="text-indigo-200 text-[10px] font-bold mb-3">Registre quem jogou contra quem (todos contra todos).</Text>
        <View className="space-y-2">
          {confrontos.map((confronto, indice) => <View key={`${confronto.a}-${confronto.b}`} className="bg-slate-900/40 p-3 rounded-xl">
            <View className="flex-row items-center justify-between mb-2"><Text className="text-slate-200 text-[10px] font-black">{nomeDoTime(sorteio?.times?.[confronto.a], confronto.a).toUpperCase()}</Text><Text className="text-slate-500 text-[10px] font-black">×</Text><Text className="text-slate-200 text-[10px] font-black">{nomeDoTime(sorteio?.times?.[confronto.b], confronto.b).toUpperCase()}</Text></View>
            <View className="flex-row items-center justify-center gap-2">
              <TextInput value={String(confronto.vitoriasA)} onChangeText={(valor) => atualizarConfronto(indice, 'vitoriasA', valor)} keyboardType="number-pad" className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl" />
              <Text className="text-slate-500 font-black">×</Text>
              <TextInput value={String(confronto.vitoriasB)} onChangeText={(valor) => atualizarConfronto(indice, 'vitoriasB', valor)} keyboardType="number-pad" className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl" />
            </View>
          </View>)}
        </View>
      </View>}
      {(sorteio.reservas || []).length > 0 && <View className="bg-amber-500/10 p-4 rounded-2xl mb-4"><Text className="text-amber-300 text-xs font-black mb-2">RESERVAS — toque para trocar</Text>{sorteio.reservas.map((registro, indice) => { const id = typeof registro === 'string' ? registro : registro.id; const local = { tipo: 'reserva', indice }; const jogador = jogadores.find((j) => j.id === id) || { id, nome: 'Jogador' }; const stat = infoJogador(jogador); return <TouchableOpacity key={`reserva-${id}-${indice}`} disabled={salvando} onPress={() => selecionarJogador(local)} className={`p-3 rounded-xl mb-1 flex-row items-center gap-2 ${estaSelecionado(local) ? 'bg-indigo-500' : 'bg-slate-900/40'}`}><Avatar jogador={jogador} size={24} /><Text className="text-slate-100 font-bold text-xs">{jogador.nome}{!stat.historicoSuficiente && <Text className="text-amber-300 text-[9px]"> · histórico insuficiente</Text>}</Text></TouchableOpacity>; })}</View>}
      <TouchableOpacity disabled={salvando} onPress={concluir} className="bg-emerald-600 py-4 rounded-2xl items-center"><Text className="text-white font-black text-xs uppercase">Concluir rodada e ensinar o algoritmo</Text></TouchableOpacity>
    </View>}
    {!sorteio && !carregando && <View className="py-12 items-center opacity-50"><FontAwesome5 name="brain" size={42} color="#22d3ee" /><Text className="text-slate-500 font-black text-xs mt-4 uppercase">Aguardando sorteio</Text></View>}
  </ScrollView>;
}