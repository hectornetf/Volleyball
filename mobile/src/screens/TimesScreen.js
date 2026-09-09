import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, ActivityIndicator, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores } from '../services/jogadorService';
import { carregarHistoricoTimes, concluirSorteio, salvarSorteio, subscribeSorteioAberto, trocarJogadoresDoSorteio } from '../services/teamDrawService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const dias = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const diaAtual = () => dias[[6, 0, 1, 2, 3, 4, 5][new Date().getDay()]] || 'Segunda';

const criarEstatisticas = (historico) => {
  const resultado = {};
  historico.forEach((sorteio) => {
    const maior = Math.max(...(sorteio.times || []).map((time) => Number(time.vitorias) || 0), 0);
    (sorteio.times || []).forEach((time) => (time.jogadores || []).forEach((j) => {
      const atual = resultado[j.id] || { jogos: 0, vitorias: 0 };
      atual.jogos += 1;
      atual.vitorias += maior ? (Number(time.vitorias) || 0) / maior : 0.5;
      resultado[j.id] = atual;
    }));
  });
  return resultado;
};

const poderJogador = (jogador, estatisticas) => {
  const nivel = Number(jogador.nivel) || 3;
  const historico = estatisticas[jogador.id];
  if (!historico) return nivel;
  const confianca = Math.min(historico.jogos / 8, 1);
  return nivel + ((historico.vitorias / historico.jogos) - 0.5) * 1.2 * confianca;
};

const equilibrar = (jogadores, historico, jogadoresPorTime) => {
  const estatisticas = criarEstatisticas(historico);
  const quantidadeTimes = Math.floor(jogadores.length / jogadoresPorTime);
  const ordenados = [...jogadores].sort((a, b) => poderJogador(b, estatisticas) - poderJogador(a, estatisticas) || Math.random() - 0.5);
  const times = Array.from({ length: quantidadeTimes }, () => []);
  const poderes = Array(quantidadeTimes).fill(0);
  ordenados.slice(0, quantidadeTimes * jogadoresPorTime).forEach((jogador) => {
    const indice = poderes.map((poder, i) => ({ poder, i })).filter(({ i }) => times[i].length < jogadoresPorTime).reduce((a, b) => b.poder < a.poder ? b : a).i;
    times[indice].push(jogador);
    poderes[indice] += poderJogador(jogador, estatisticas);
  });
  // Melhora a distribuição com trocas entre o time mais forte e o mais fraco.
  for (let tentativa = 0; tentativa < 80; tentativa += 1) {
    const forte = poderes.indexOf(Math.max(...poderes));
    const fraco = poderes.indexOf(Math.min(...poderes));
    let melhor = null;
    let diferenca = poderes[forte] - poderes[fraco];
    times[forte].forEach((a, ia) => times[fraco].forEach((b, ib) => {
      const nova = Math.abs((poderes[forte] - poderJogador(a, estatisticas) + poderJogador(b, estatisticas)) - (poderes[fraco] - poderJogador(b, estatisticas) + poderJogador(a, estatisticas)));
      if (nova < diferenca) { diferenca = nova; melhor = { a, b, ia, ib }; }
    }));
    if (!melhor) break;
    times[forte][melhor.ia] = melhor.b; times[fraco][melhor.ib] = melhor.a;
    poderes[forte] += poderJogador(melhor.b, estatisticas) - poderJogador(melhor.a, estatisticas);
    poderes[fraco] += poderJogador(melhor.a, estatisticas) - poderJogador(melhor.b, estatisticas);
  }
  return { times, reservas: ordenados.slice(quantidadeTimes * jogadoresPorTime), diagnostico: { poderes: poderes.map((p) => Math.round(p * 10) / 10), jogadoresComHistorico: Object.keys(estatisticas).length } };
};

export default function TimesScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId } = useSession();
  const [dia, setDia] = useState(diaAtual);
  const [jogadores, setJogadores] = useState([]);
  const [sorteio, setSorteio] = useState(null);
  const [vitorias, setVitorias] = useState([]);
  const [jogadoresPorTime, setJogadoresPorTime] = useState(6);
  const [selecao, setSelecao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => activeGroupId ? subscribeJogadores(activeGroupId, (dados) => { setJogadores(dados); setCarregando(false); }) : undefined, [activeGroupId]);
  useEffect(() => activeGroupId ? subscribeSorteioAberto(activeGroupId, dia, (dados) => { setSorteio(dados); setSelecao(null); setVitorias((dados?.times || []).map((t) => String(t.vitorias || 0))); }) : undefined, [activeGroupId, dia]);
  useFocusEffect(React.useCallback(() => {
    setDia(diaAtual());
  }, []));
  const confirmados = useMemo(() => jogadores.filter((j) => j.presencas?.[dia] === 'Confirmado'), [jogadores, dia]);
  const times = useMemo(() => (sorteio?.times || []).map((time) => time.jogadores.map((registro) => {
    const id = typeof registro === 'string' ? registro : registro.id;
    return jogadores.find((j) => j.id === id) || { ...(typeof registro === 'string' ? { id } : registro), nome: 'Jogador removido', nivel: registro.nivelNoSorteio };
  })), [sorteio, jogadores]);

  const gerar = async () => {
    if (confirmados.length < jogadoresPorTime * 2) return Alert.alert('Faltam atletas', `São necessários pelo menos ${jogadoresPorTime * 2} confirmados para formar dois times de ${jogadoresPorTime}.`);
    setSalvando(true);
    try {
      const resultado = equilibrar(confirmados, await carregarHistoricoTimes(activeGroupId), jogadoresPorTime);
      await salvarSorteio({ groupId: activeGroupId, dia, ...resultado });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) { Alert.alert('Não foi possível salvar', 'Verifique sua conexão e tente novamente.'); } finally { setSalvando(false); }
  };
  const concluir = async () => { setSalvando(true); try { await concluirSorteio(sorteio.id, vitorias, activeGroupId); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (_) { Alert.alert('Não foi possível concluir', 'Tente novamente.'); } finally { setSalvando(false); } };
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
    <View className="bg-slate-800/40 p-6 rounded-[32px] border border-white/5 mb-6"><View className="flex-row justify-between items-center"><View><Text className="text-white text-lg font-black">Jogadores por time</Text><Text className="text-slate-400 text-xs mt-1">Defina o formato da rodada.</Text></View><View className="flex-row items-center bg-slate-900 rounded-xl overflow-hidden"><TouchableOpacity disabled={!!sorteio || jogadoresPorTime <= 1} onPress={() => setJogadoresPorTime((valor) => Math.max(1, valor - 1))} className="px-4 py-3"><Text className="text-white font-black text-lg">−</Text></TouchableOpacity><Text className="text-cyan-300 font-black text-lg w-8 text-center">{jogadoresPorTime}</Text><TouchableOpacity disabled={!!sorteio} onPress={() => setJogadoresPorTime((valor) => valor + 1)} className="px-4 py-3"><Text className="text-white font-black text-lg">+</Text></TouchableOpacity></View></View><Text className="text-cyan-100 text-xs leading-5 mt-4">{confirmados.length} confirmados: {Math.floor(confirmados.length / jogadoresPorTime)} time(s) completo(s){confirmados.length % jogadoresPorTime ? ` e ${confirmados.length % jogadoresPorTime} reserva(s)` : ''}. O cálculo usa nível atual e os resultados anteriores.</Text><TouchableOpacity disabled={salvando || !!sorteio} onPress={gerar} className={`w-full py-4 rounded-2xl items-center mt-5 ${sorteio ? 'bg-slate-700' : 'bg-cyan-600'}`}>{salvando ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-xs uppercase">{sorteio ? 'Rodada aguardando conclusão' : 'Gerar times equilibrados'}</Text>}</TouchableOpacity></View>
    {carregando && <ActivityIndicator size="large" color="#22d3ee" />}
    {sorteio && <View>
      <View className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl mb-5"><Text className="text-indigo-200 text-xs font-bold">Para ajustar: toque em um jogador e depois no atleta com quem deseja trocar. As equipes manterão a mesma quantidade de jogadores.</Text></View>
      <TouchableOpacity onPress={whatsapp} className="bg-[#25D366] py-4 rounded-2xl items-center mb-5"><Text className="text-white font-black text-xs uppercase">Enviar escalação</Text></TouchableOpacity>
      {times.map((time, indice) => <View key={indice} className="bg-slate-800/60 rounded-[28px] border border-white/5 mb-4 overflow-hidden"><View className="p-4 bg-cyan-500/10 flex-row justify-between"><Text className="text-cyan-300 font-black">TIME {indice + 1} · {time.length} ATLETAS</Text><Text className="text-cyan-200 text-xs font-bold">Poder {sorteio.diagnostico?.poderes?.[indice]}</Text></View><View className="p-4">{time.map((j, posicao) => { const local = { tipo: 'time', indice, posicao }; return <TouchableOpacity key={j.id} disabled={salvando} onPress={() => selecionarJogador(local)} className={`p-3 rounded-xl mb-2 ${estaSelecionado(local) ? 'bg-indigo-500 border border-indigo-300' : 'bg-slate-900/40'}`}><Text className="text-slate-100 font-bold text-xs">{j.nome} <Text className="text-amber-400">★ {j.nivel || 3}</Text></Text></TouchableOpacity>; })}<View className="border-t border-white/10 mt-2 pt-3 flex-row items-center justify-between"><Text className="text-slate-300 font-black text-xs">PARTIDAS VENCIDAS</Text><TextInput value={vitorias[indice] || ''} onChangeText={(valor) => setVitorias((atual) => atual.map((item, i) => i === indice ? valor.replace(/[^0-9]/g, '') : item))} keyboardType="number-pad" className="bg-slate-900 text-white text-center font-black w-16 py-2 rounded-xl" /></View></View></View>)}
      {(sorteio.reservas || []).length > 0 && <View className="bg-amber-500/10 p-4 rounded-2xl mb-4"><Text className="text-amber-300 text-xs font-black mb-2">RESERVAS — toque para trocar</Text>{sorteio.reservas.map((registro, indice) => { const id = typeof registro === 'string' ? registro : registro.id; const local = { tipo: 'reserva', indice }; const jogador = jogadores.find((j) => j.id === id) || { id, nome: 'Jogador' }; return <TouchableOpacity key={`reserva-${id}-${indice}`} disabled={salvando} onPress={() => selecionarJogador(local)} className={`p-3 rounded-xl mb-1 ${estaSelecionado(local) ? 'bg-indigo-500' : 'bg-slate-900/40'}`}><Text className="text-slate-100 font-bold text-xs">{jogador.nome}</Text></TouchableOpacity>; })}</View>}
      <TouchableOpacity disabled={salvando} onPress={concluir} className="bg-emerald-600 py-4 rounded-2xl items-center"><Text className="text-white font-black text-xs uppercase">Concluir rodada e ensinar o algoritmo</Text></TouchableOpacity>
    </View>}
    {!sorteio && !carregando && <View className="py-12 items-center opacity-50"><FontAwesome5 name="brain" size={42} color="#22d3ee" /><Text className="text-slate-500 font-black text-xs mt-4 uppercase">Aguardando sorteio</Text></View>}
  </ScrollView>;
}
