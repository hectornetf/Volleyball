import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Linking, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ExpoClipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores, getSaldoGlobalEquipamentos, getConfigFinanceira } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId, logout: logoutSession } = useSession();
  const [elenco, setElenco] = useState([]);
  const [saldoEquipamentos, setSaldoEquipamentos] = useState(0); // Avulsos (Equipamentos)
  const [totalQuadra, setTotalQuadra] = useState(0); // Mensalistas (Quadra)
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(30));

  const carregarDados = async () => {
    if (!activeGroupId) return;
    try {
      // Saldo real do fundo de equipamentos (operações ENTRADA_AVULSO)
      const saldo = await getSaldoGlobalEquipamentos(activeGroupId);
      setSaldoEquipamentos(saldo);
    } catch (e) {
      console.error(e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (dados) => {
      setElenco(dados);
      // Calcula total da quadra: mensalistas que pagaram mensalidade (R$10 cada por simplificação legado)
      // O legado usa operações ENTRADA_MENSALISTA — aqui aproximamos via mensalidadePaga
      const pago = dados.filter(j => j.tipo === 'MENSALISTA' && j.mensalidadePaga).length;
      setTotalQuadra(pago * 10);
    });
    carregarDados();

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();

    return () => unsub();
  }, [activeGroupId]);

  const onRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  // ============================================================
  // CÁLCULOS (Paridade com Legado)
  // ============================================================

  const hoje = new Date();
  const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
  const diaAtual = hoje.getDate().toString().padStart(2, '0');

  // Aniversariantes DO DIA (paridade legado — apenas hoje, como o original)
  const aniversariantesHoje = elenco.filter(j => {
    if (!j.dataNascimento) return false;
    const dn = j.dataNascimento;
    return dn.includes(`-${mesAtual}-${diaAtual}`) ||
           dn.startsWith(`${diaAtual}/${mesAtual}`);
  });

  // Stats de jogadores
  const totalElenco = elenco.length;
  const mensalistas = elenco.filter(j => j.tipo === 'MENSALISTA').length;
  const mediaNivel = elenco.length > 0
    ? (elenco.reduce((acc, j) => acc + (j.nivel || 3), 0) / elenco.length).toFixed(1)
    : '—';

  // Financeiro — paridade legado
  const totalGeral = totalQuadra + saldoEquipamentos;
  const progQuadra = totalGeral > 0 ? (totalQuadra / totalGeral) * 100 : 0;
  const progEquipamentos = totalGeral > 0 ? (saldoEquipamentos / totalGeral) * 100 : 0;

  // Pendências — mensalistas com mensalidade em aberto (paridade legado: devedores com valor)
  const devedores = elenco
    .filter(j => j.tipo === 'MENSALISTA' && !j.mensalidadePaga)
    .sort((a, b) => a.nome.localeCompare(b.nome))
    .map(j => ({ ...j, valor: 10 })); // R$10 por mensalista (padrão legado)

  const saldoEmAberto = devedores.reduce((acc, d) => acc + d.valor, 0);

  // Ranking Top 5 Assíduos
  const ranking = [...elenco]
    .sort((a, b) => (b.historicoPresencas || 0) - (a.historicoPresencas || 0))
    .slice(0, 5);

  // Equilíbrio Técnico — distribuição por nível (legado: gráfico de barras)
  const niveis = [1, 2, 3, 4, 5].map(n => ({
    nivel: n,
    qtd: elenco.filter(j => (j.nivel || 3) === n).length
  }));
  const maxNivel = Math.max(...niveis.map(n => n.qtd), 1);

  // ============================================================
  // AÇÕES
  // ============================================================

  const copiarCodigo = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await ExpoClipboard.setStringAsync(activeGroupId);
    Alert.alert('Copiado!', 'Código copiado para a área de transferência ✅');
  };

  const compartilharWhatsapp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const msg = `🏐 *CONVITE VOLEIZIN* 🏐\n\nFala galera! Entrem no nosso grupo usando o código:\n\n🔑 *${activeGroupId}*\n\nBora pro jogo! 🔥`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('Erro', 'WhatsApp não instalado.')
    );
  };

  // Cobrar todos os devedores no grupo (paridade legado: "Enviar Cobrança no Grupo")
  const cobrarGrupo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (devedores.length === 0) return;
    const lista = devedores.map(d => `- ${d.nome}: R$ ${d.valor.toFixed(2).replace('.', ',')}`).join('\n');
    const msg = `🏐 *VOLEIZIN: Pendências do Mês* 🏐\n\nGalera, os seguintes atletas ainda têm mensalidade em aberto:\n\n${lista}\n\n💰 Total: R$ ${saldoEmAberto.toFixed(2).replace('.', ',')}\n\nPor favor, regularizem para garantir a vaga! 🙏`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('Erro', 'WhatsApp não instalado.')
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0b0f1a]"
      contentContainerStyle={{ paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      {/* Cabeçalho */}
      <Animated.View
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], paddingTop: Math.max(insets.top, 20) }}
        className="p-6 items-center relative"
      >
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert('Sair', 'Deseja sair deste grupo?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: () => logoutSession() }
            ]);
          }}
          className="absolute top-6 right-6 bg-red-500/10 border border-red-500/30 p-2.5 rounded-xl z-50"
          style={{ top: Math.max(insets.top, 20) + 8 }}
        >
          <FontAwesome5 name="sign-out-alt" size={14} color="#ef4444" />
        </TouchableOpacity>

        <View className="bg-slate-800/80 p-5 rounded-full border border-white/10 shadow-2xl mb-3">
          <FontAwesome5 name="volleyball-ball" size={44} color="#10b981" />
        </View>
        <Text className="text-4xl font-black text-white mb-1">
          Voleizin<Text className="text-emerald-400">Pro</Text>
        </Text>
        <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-[4px] mb-4">Organização, Times e Finanças</Text>

        {/* Código do grupo */}
        <View className="flex-row items-center bg-slate-900/60 p-1 rounded-2xl border border-white/5 shadow-sm">
          <View className="bg-emerald-500/20 px-3 py-1.5 rounded-xl mr-2">
            <Text className="text-emerald-400 font-bold text-[8px] uppercase tracking-widest">DNA DOS CRIA</Text>
          </View>
          <View className="flex-row items-center bg-cyan-500/10 rounded-xl px-3 py-2 border border-cyan-500/20">
            <Text className="text-cyan-400 font-black text-xs uppercase mr-3">{activeGroupId}</Text>
            <TouchableOpacity onPress={copiarCodigo} className="p-2 bg-cyan-500/20 rounded-xl mr-2 active:scale-95">
              <FontAwesome5 name="copy" size={12} color="#22d3ee" />
            </TouchableOpacity>
            <TouchableOpacity onPress={compartilharWhatsapp} className="p-2 bg-emerald-500/20 rounded-xl active:scale-95">
              <FontAwesome5 name="whatsapp" size={12} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <View className="px-4 space-y-4">

        {/* ── Aniversariantes do Dia (paridade legado) ── */}
        {aniversariantesHoje.length > 0 && (
          <View className="bg-slate-800/45 p-5 rounded-2xl border-l-4 border-pink-500 border border-white/5 mb-1">
            <View className="flex-row items-center mb-3">
              <FontAwesome5 name="birthday-cake" size={15} color="#ec4899" />
              <Text className="text-white font-bold ml-2 text-sm">Aniversariantes de Hoje! 🎂</Text>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {aniversariantesHoje.map(a => (
                <View key={a.id} className="bg-pink-500 px-3 py-1.5 rounded-full shadow-lg shadow-pink-500/20">
                  <Text className="text-white text-[10px] font-black uppercase">{a.nome}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Cards de Stats ── */}
        <View className="flex-row gap-3 mb-1">
          <View className="flex-1 bg-slate-800/45 p-4 rounded-2xl border-l-4 border-blue-500 border border-white/5">
            <Text className="text-[10px] text-slate-400 font-bold uppercase">Total Elenco</Text>
            <Text className="text-2xl font-black text-white mt-0.5">{totalElenco}</Text>
            <Text className="text-[9px] text-blue-400 font-bold mt-1">{mensalistas} Mensalistas</Text>
          </View>
          <View className="flex-1 bg-slate-800/45 p-4 rounded-2xl border-l-4 border-emerald-500 border border-white/5">
            <Text className="text-[10px] text-slate-400 font-bold uppercase">Nível Médio</Text>
            <Text className="text-2xl font-black text-white mt-0.5">⭐ {mediaNivel}</Text>
            <Text className="text-[9px] text-emerald-400 font-bold mt-1">Escala 1 a 5</Text>
          </View>
        </View>

        {/* ── Arrecadação Acumulada (paridade legado) ── */}
        <View className="bg-slate-800/45 p-5 rounded-2xl border border-white/5 mb-1">
          <View className="flex-row items-center gap-2 mb-4">
            <FontAwesome5 name="vault" size={14} color="#facc15" />
            <Text className="text-white font-bold text-sm">Arrecadação Acumulada</Text>
          </View>
          <View className="space-y-3">
            <View>
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-xs text-slate-400">Quadra (Mensalistas)</Text>
                <Text className="text-xs text-white font-bold">R$ {totalQuadra.toFixed(2).replace('.', ',')}</Text>
              </View>
              <View className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                <View className="bg-blue-500 h-full rounded-full" style={{ width: `${progQuadra}%` }} />
              </View>
            </View>
            <View>
              <View className="flex-row justify-between mb-1.5">
                <Text className="text-xs text-slate-400">Equipamentos (Avulsos)</Text>
                <Text className="text-xs text-white font-bold">R$ {saldoEquipamentos.toFixed(2).replace('.', ',')}</Text>
              </View>
              <View className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                <View className="bg-emerald-500 h-full rounded-full" style={{ width: `${progEquipamentos}%` }} />
              </View>
            </View>
            <View className="pt-2 border-t border-slate-700/50 flex-row justify-between items-center">
              <Text className="text-sm font-bold text-slate-300">Total Geral</Text>
              <Text className="text-lg font-black text-yellow-400">R$ {totalGeral.toFixed(2).replace('.', ',')}</Text>
            </View>
          </View>
        </View>

        {/* ── Pendências do Mês (paridade legado) ── */}
        {saldoEmAberto > 0 ? (
          <View className="bg-slate-800/45 p-5 rounded-2xl border-l-4 border-red-500 border border-white/5 mb-1 overflow-hidden">
            <View className="flex-row flex-wrap justify-between items-start gap-x-3 gap-y-2 mb-4">
              <View className="flex-row items-start gap-2" style={{ flex: 1, minWidth: 0 }}>
                <FontAwesome5 name="hand-holding-usd" size={14} color="#ef4444" style={{ marginTop: 2 }} />
                <Text
                  numberOfLines={2}
                  className="text-white font-bold text-sm"
                  style={{ flex: 1, minWidth: 0 }}
                >
                  Pendências do Mês
                </Text>
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                className="text-lg font-black text-red-400"
                style={{ flexShrink: 0, maxWidth: '100%' }}
              >
                R$ {saldoEmAberto.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            <ScrollView
              style={{ maxHeight: 200 }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {devedores.map((d) => (
                <View
                  key={d.id}
                  className="flex-row justify-between items-start gap-2 p-2 bg-red-500/5 rounded-xl border border-red-500/10 mb-2"
                >
                  <Text
                    numberOfLines={3}
                    ellipsizeMode="tail"
                    className="text-sm font-semibold text-slate-300"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    {d.nome}
                  </Text>
                  <Text
                    className="text-xs font-bold text-slate-400 italic"
                    style={{ flexShrink: 0, paddingTop: 1 }}
                  >
                    R$ {d.valor.toFixed(2).replace('.', ',')}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              onPress={cobrarGrupo}
              className="mt-4 w-full bg-emerald-500/10 border border-emerald-500/30 py-2.5 px-3 rounded-xl flex-row flex-wrap justify-center items-center gap-x-2 gap-y-1 active:scale-95"
            >
              <FontAwesome5 name="whatsapp" size={14} color="#10b981" />
              <Text
                className="text-emerald-400 font-bold text-xs text-center"
                style={{ flexShrink: 1, maxWidth: '100%' }}
                numberOfLines={2}
              >
                Enviar Cobrança no Grupo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="bg-slate-800/45 p-5 rounded-2xl border-l-4 border-emerald-500 border border-white/5 flex-row items-center gap-3 mb-1">
            <FontAwesome5 name="check-circle" size={20} color="#10b981" />
            <View className="ml-2">
              <Text className="text-sm font-bold text-white">Tudo em dia!</Text>
              <Text className="text-[10px] text-slate-400">Nenhuma mensalidade pendente para este mês.</Text>
            </View>
          </View>
        )}

        {/* ── Top 5 Assíduos (paridade legado) ── */}
        <View className="bg-slate-800/45 p-5 rounded-2xl border border-white/5 mb-1">
          <View className="flex-row items-center gap-2 mb-4">
            <FontAwesome5 name="crown" size={14} color="#fbbf24" />
            <Text className="text-white font-bold text-sm">Top 5 Assíduos</Text>
          </View>
          <View className="space-y-2">
            {ranking.map((r, idx) => (
              <View key={r.id} className="flex-row justify-between items-center p-2 bg-slate-800/40 rounded-xl border border-slate-700/30">
                <View className="flex-row items-center gap-3">
                  <Text className="text-[10px] font-black text-slate-500 w-6">#{idx + 1}</Text>
                  <Text numberOfLines={1} className="text-sm font-semibold text-slate-200">{r.nome}</Text>
                </View>
                <Text className="text-xs font-bold text-emerald-400">{r.historicoPresencas || 0} jogos</Text>
              </View>
            ))}
            {ranking.length === 0 && (
              <Text className="text-center text-xs text-slate-500 py-4 italic">
                Nenhuma presença registrada ainda.
              </Text>
            )}
          </View>
        </View>

        {/* ── Equilíbrio Técnico — Gráfico de Barras (paridade legado) ── */}
        <View className="bg-slate-800/45 p-5 rounded-2xl border border-white/5 mb-1">
          <View className="flex-row items-center gap-2 mb-4">
            <FontAwesome5 name="balance-scale" size={14} color="#22d3ee" />
            <Text className="text-white font-bold text-sm">Equilíbrio do Grupo</Text>
          </View>
          <View className="flex-row items-end justify-between h-24 px-2">
            {niveis.map(n => (
              <View key={n.nivel} className="flex-1 flex-col items-center gap-1">
                <Text className="text-[9px] text-slate-400 font-bold">{n.qtd}</Text>
                <View
                  className="w-full bg-cyan-500/20 border-t border-cyan-500/50 rounded-t-sm"
                  style={{ height: `${(n.qtd / maxNivel) * 100}%`, minHeight: n.qtd > 0 ? 4 : 0 }}
                />
                <Text className="text-[10px] font-black text-slate-500">⭐{n.nivel}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Apoio ao Dev ── */}
        <View className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 mb-6">
          <View className="flex-row items-center justify-between flex-wrap gap-3">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">☕</Text>
              <View>
                <Text className="text-sm font-bold text-slate-200">Gostou do VoleizinDosCria?</Text>
                <Text className="text-[10px] text-slate-400">Pague um café pro dev!</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.buymeacoffee.com/hectornetf')}
                className="bg-yellow-400 px-4 py-2 rounded-xl"
              >
                <Text className="text-slate-900 font-black text-[10px] uppercase">Café ☕</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://ko-fi.com/hectornetf')}
                className="bg-amber-500 px-4 py-2 rounded-xl"
              >
                <Text className="text-white font-black text-[10px] uppercase">Ko-fi ❤️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

      </View>
    </ScrollView>
  );
}
