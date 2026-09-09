import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores } from '../services/jogadorService';
import { carregarHistoricoTimes, concluirSorteio, salvarSorteio, subscribeSorteioAberto, trocarJogadoresDoSorteio } from '../services/teamDrawService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { criarEstatisticas, equilibraTimes, estatisticaJogador, gerarConfrontos } from '../utils/estatisticasUtils';

const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const diaAtual = () => dias[[6, 0, 1, 2, 3, 4, 5][new Date().getDay()]] || 'Segunda';

export default function TimesScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId } = useSession();
  const [dia, setDia] = useState(diaAtual);
  const [jogadores, setJogadores] = useState([]);
  const [sorteio, setSorteio] = useState(null);
  const [confrontos, setConfrontos] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(6);
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

  const confirmados = useMemo(() => jogadores.filter((j) => j.presencas?.[dia] === 'Confirmado'), [jogadores, dia]);
  const estatisticas = useMemo(() => criarEstatisticas(historico), [historico]);
  const infoJogador = (jogador) => estatisticaJogador(jogador, estatisticas);
  const times = useMemo(() => (sorteio?.times || []).map((time) => time.jogadores.map((registro) => {
    const id = typeof registro === 'string' ? registro : registro.id;
    return jogadores.find((j) => j.id === id) || { ...(typeof registro === 'string' ? { id } : registro), nome: 'Jogador removido', nivel: registro.nivelNoSorteio };
  })), [sorteio, jogadores]);

  const vitoriasDoTime = (indice) => confrontos.reduce((soma, c) => soma + (c.a === indice ? Number(c.vitoriasA) || 0 : c.b === indice ? Number(c.vitoriasB) || 0 : 0), 0);
  const atualizarConfronto = (indice, campo, valor) => setConfrontos((atual) => atual.map((c, i) => i === indice ? { ...c, [campo]: valor.replace(/[^0-9]/g, '') } : c));

  const gerar = async () => {
    if (confirmados.length < jogadoresPorTime * 2) return Alert.alert('Faltam atletas', `São necessários pelo menos ${jogadoresPorTime * 2} confirmados para formar dois times de ${jogadoresPorTime}.`);
    setSalvando(true);
    try {
      const dadosHistoricos = await carregarHistoricoTimes(activeGroupId);
      setHistorico(dadosHistoricos);
      const resultado = equilibraTimes(confirmados, dadosHistoricos, jogadoresPorTime);
      await salvarSorteio({ groupId: activeGroupId, dia, ...resultado });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) { Alert.alert('Não foi possível salvar', 'Verifique sua conexão e tente novamente.'); } finally { setSalvando(false); }
  };
  const concluir = async () => { setSalvando(true); try { await concluirSorteio(sorteio.id, confrontos, activeGroupId); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) { Alert.alert('Não foi possível concluir', 'Tente novamente.'); } finally { setSalvando(false); } };
  const selecionarJogador = async (local) => {
    if (!selecao) { setSelecao(local); return; }
    if (selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao) { setSelecao(null); return; }
    setSalvando(true);
    try {
      await trocarJogadoresDoSorteio(sorteio.id, selecao, local, activeGroupId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) { Alert.alert('Não foi possível alterar', 'Tente novamente.'); }
    finally { setSalvando(false); setSelecao(null); }
  };
  const estaSelecionado = (local) => selecao && selecao.tipo === local.tipo && selecao.indice === local.indice && selecao.posicao === local.posicao;
  const whatsapp = () => { const texto = times.map((time, i) => `*Time ${i + 1}*\n${time.map((j) => `- ${j.nome} (Nível ${j.nivel || 3})`).join('\n')}`).join('\n\n'); Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`🏐 *VOLEIZIN: TIMES SORTEADOS*\n\n${texto}`)}`).catch(() => Alert.alert('Erro', 'WhatsApp não instalado.')); };

  return <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
    <View style={{ marginTop: Math.max(insets.top, 20) }} className="flex-row justify-between items-center mb-7"><View><Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px]">Sorteio inteligente</Text><Text className="text-white text-3xl font-black mt-1">Montar <Text className="text-cyan-400">Times</Text></Text></View><FontAwesome5 name="brain" size={28} color="#22d3ee" /></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6" contentContainerStyle={{ gap: 8 }}>{dias.map((item) => <TouchableOpacity key={item} onPress={() => setDia(item)} className={`px-4 py-2 rounded-xl ${dia === item ? 'bg-cyan-500' : 'bg-slate-800'}`}><Text className="text-white text-xs font-bold">{item}</Text></TouchableOpacity>)}</ScrollView>
    <View className="bg-slate-800/40 p-6 rounded-[32px] border border-white/5 mb-6"><View className="flex-row justify-between items-center"><View><Text className="text-white text-lg font-black">Jogadores por time</Text><Text className="text-slate-400 text-xs mt-1">Defina o formato da rodada.</Text></View><View className="flex-row items-center bg-slate-900 rounded-xl overflow-hidden"><TouchableOpacity disabled={!!sorteio || jogadoresPorTime <= 1} onPress={() => setJogadoresPorTime((valor) => Math.max(1, valor - 1))} className="px-4 py-3"><Text className="text-white font-black text-lg">−</Text></TouchableOpacity><Text className="text-cyan-300 font-black text-lg w-8 text-center">{jogadoresPorTime}</Text><TouchableOpacity disabled={!!sorteio} onPress={() => setJogadoresPorTime((valor) => valor + 1)} className="px-4 py-3"><Text className="text-white font-black text-lg">+</Text></TouchableOpacity></View></View><Text className="text-cyan-100 text-xs leading-5 mt-4">{confirmados.length} confirmados: {Math.floor(confirmados.length / jogadoresPorTime)} time(s) completo(s){confirmados.length % jogadoresPorTime ? ` e ${confirmados.length % jogadoresPorTime} reserva(s)` : ''}. O cálculo usa o nível atual, os resultados anteriores (com nota de confiança) e evita repetir duplas e trios.</Text><TouchableOpacity disabled={salvando || !!sorteio} onPress={gerar} className={`w-full py-4 rounded-2xl items-center mt-5 ${sorteio ? 'bg-slate-700' : 'bg-cyan-600'}`}>{salvando ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-xs uppercase">{sorteio ? 'Rodada aguardando conclusão' : 'Gerar times equilibrados'}</Text>}</TouchableOpacity></View>
    {carregando && <ActivityIndicator size="large" color="#22d3ee" />}
    {sorteio && <View>
      <View className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-5"><Text className="text-indigo-200 text-xs font-bold">Para ajustar: toque em um jogador e depois no atleta com quem deseja trocar. As equipes manterão a mesma quantidade de jogadores.</Text></View>
      {sorteio.diagnostico?.repeticaoTotal !== undefined && <View className="bg-slate-800/40 p-3 rounded-2xl mb-5"><Text className="text-slate-300 text-[10px] font-bold">Parcerias repetidas na rodada: {sorteio.diagnostico.repeticaoTotal} · Trocas de variedade: {sorteio.diagnostico.variedadeAplicada || 0} · Atletas com histórico: {sorteio.diagnostico.jogadoresComHistorico}</Text></View>}
      <TouchableOpacity onPress={whatsapp} className="bg-[#25D366] py-4 rounded-2xl items-center mb-5"><Text className="text-white font-black text-xs uppercase">Enviar escalação</Text></TouchableOpacity>
      {times.map((time, indice) => <View key={indice} className="bg-slate-800/60 rounded-[28px] border border-white/5 mb-4 overflow-hidden"><View className="p-4 bg-cyan-500/10 flex-row justify-between"><Text className="text-cyan-300 font-black">TIME {indice + 1} · {time.length} ATLETAS</Text><Text className="text-cyan-200 text-xs font-bold">Poder {sorteio.diagnostico?.poderes?.[indice]} · V {vitoriasDoTime(indice)}</Text></View><View className="p-4">{time.map((j, posicao) => { const local = { tipo: 'time', indice, posicao }; const stat = infoJogador(j); return <TouchableOpacity key={j.id} disabled={salvando} onPress={() => selecionarJogador(local)} className={`p-3 rounded-xl mb-2 ${estaSelecionado(local) ? 'bg-indigo-500 border border-indigo-300' : 'bg-slate-900/40'}`}><Text className="text-slate-100 font-bold text-xs">{j.nome} <Text className="text-amber-400">★ {j.nivel || 3}</Text>{!stat.historicoSuficiente && <Text className="text-amber-300 text-[9px]"> · histórico insuficiente</Text>}</Text></TouchableOpacity>; })}</View></View>)}
      {confrontos.length > 0 && <View className="bg-indigo-500/10 p-4 rounded-[28px] border border-indigo-500/20 mb-4">
        <Text className="text-indigo-300 text-xs font-black mb-1">PLACAR POR CONFRONTO</Text>
        <Text className="text-indigo-200 text-[10px] font-bold mb-3">Registre quem jogou contra quem (todos contra todos).</Text>
        <View className="space-y-2">
          {confrontos.map((confronto, indice) => <View key={`${confronto.a}-${confronto.b}`} className="bg-slate-900/40 p-3 rounded-xl">
            <View className="flex-row items-center justify-between mb-2"><Text className="text-slate-200 text-[10px] font-black">TIME {confronto.a + 1}</Text><Text className="text-slate-500 text-[10px] font-black">×</Text><Text className="text-slate-200 text-[10px] font-black">TIME {confronto.b + 1}</Text></View>
            <View className="flex-row items-center justify-center gap-2">
              <TextInput value={String(confronto.vitoriasA)} onChangeText={(valor) => atualizarConfronto(indice, 'vitoriasA', valor)} keyboardType="number-pad" className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl" />
              <Text className="text-slate-500 font-black">×</Text>
              <TextInput value={String(confronto.vitoriasB)} onChangeText={(valor) => atualizarConfronto(indice, 'vitoriasB', valor)} keyboardType="number-pad" className="bg-slate-900 text-white text-center font-black w-14 py-2 rounded-xl" />
            </View>
          </View>)}
        </View>
      </View>}
      {(sorteio.reservas || []).length > 0 && <View className="bg-amber-500/10 p-4 rounded-2xl mb-4"><Text className="text-amber-300 text-xs font-black mb-2">RESERVAS — toque para trocar</Text>{sorteio.reservas.map((registro, indice) => { const id = typeof registro === 'string' ? registro : registro.id; const local = { tipo: 'reserva', indice }; const jogador = jogadores.find((j) => j.id === id) || { id, nome: 'Jogador' }; const stat = infoJogador(jogador); return <TouchableOpacity key={`reserva-${id}-${indice}`} disabled={salvando} onPress={() => selecionarJogador(local)} className={`p-3 rounded-xl mb-1 ${estaSelecionado(local) ? 'bg-indigo-500' : 'bg-slate-900/40'}`}><Text className="text-slate-100 font-bold text-xs">{jogador.nome}{!stat.historicoSuficiente && <Text className="text-amber-300 text-[9px]"> · histórico insuficiente</Text>}</Text></TouchableOpacity>; })}</View>}
      <TouchableOpacity disabled={salvando} onPress={concluir} className="bg-emerald-600 py-4 rounded-2xl items-center"><Text className="text-white font-black text-xs uppercase">Concluir rodada e ensinar o algoritmo</Text></TouchableOpacity>
    </View>}
    {!sorteio && !carregando && <View className="py-12 items-center opacity-50"><FontAwesome5 name="brain" size={42} color="#22d3ee" /><Text className="text-slate-500 font-black text-xs mt-4 uppercase">Aguardando sorteio</Text></View>}
  </ScrollView>;
}