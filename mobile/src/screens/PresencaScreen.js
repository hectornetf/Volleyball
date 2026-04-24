import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Linking, RefreshControl, Animated
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import {
  subscribeJogadores, updateJogador,
  registrarOperacaoFinanceira, incrementarPresencaHistorica,
  getConfigFinanceira
} from '../services/jogadorService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

// Descobre a próxima data do dia da semana (paridade legado: data embaixo do botão)
const descobrirProximaData = (nomeDia) => {
  const mapa = { Segunda: 1, Terça: 2, Quarta: 3, Quinta: 4, Sexta: 5, Sábado: 6, Domingo: 0 };
  const alvo = mapa[nomeDia];
  const hoje = new Date();
  const diff = (alvo - hoje.getDay() + 7) % 7;
  const prox = new Date(hoje);
  prox.setDate(hoje.getDate() + (diff === 0 ? 0 : diff));
  return `${String(prox.getDate()).padStart(2, '0')}/${String(prox.getMonth() + 1).padStart(2, '0')}`;
};

export default function PresencaScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId } = useSession();
  const [diaSelecionado, setDiaSelecionado] = useState(() => {
    // Inicia no dia da semana atual
    const hoje = new Date().getDay(); // 0=Dom,1=Seg...
    const mapa = [6, 0, 1, 2, 3, 4, 5]; // domingo=6,segunda=0
    return diasDaSemana[mapa[hoje]] ?? 'Segunda';
  });
  const [todosJogadores, setTodosJogadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [valorAvulso, setValorAvulso] = useState(10);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  const carregarValorAvulso = useCallback(() => {
    if (!activeGroupId) return;
    const hoje = new Date();
    const strMesAtual = hoje.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase());
    
    getConfigFinanceira(activeGroupId, strMesAtual).then(conf => {
      setValorAvulso(parseFloat(String(conf?.Avulso || 10).replace(',', '.')));
    }).catch(console.error);
  }, [activeGroupId]);

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, dados => {
      setTodosJogadores(dados);
      setCarregando(false);
    }, err => { console.error(err); setCarregando(false); });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    return () => unsub();
  }, [activeGroupId]);

  useFocusEffect(
    useCallback(() => {
      carregarValorAvulso();
    }, [carregarValorAvulso])
  );

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  // Exibe todos os jogadores (sem filtro de dia, para permitir que mensalistas joguem como avulsos em outros dias)
  const jogadoresDoDia = todosJogadores.sort((a, b) => a.nome.localeCompare(b.nome));

  // Totais para o cabeçalho
  const confirmados = jogadoresDoDia.filter(j => (j.presencas?.[diaSelecionado]) === 'Confirmado');
  const totalConfirmados = {
    total: confirmados.length,
    mensalista: confirmados.filter(j => j.tipo === 'MENSALISTA' && (j.diasMensalista || []).includes(diaSelecionado)).length,
    avulso: confirmados.filter(j => j.tipo === 'AVULSO' || (j.tipo === 'MENSALISTA' && !(j.diasMensalista || []).includes(diaSelecionado))).length,
  };

  const marcar = async (jogador, status) => {
    try {
      const isMensalistaDesteDia = jogador.tipo === 'MENSALISTA' && (jogador.diasMensalista || []).includes(diaSelecionado);
      const isAvulsoDesteDia = !isMensalistaDesteDia;

      // Avulso não pago não pode confirmar
      if (isAvulsoDesteDia && !jogador.diariaPaga && status === 'Confirmado') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Atenção', `Para jogar hoje, ${jogador.nome} atua como Avulso e deve pagar a diária de R$${valorAvulso}!`);
        return;
      }

      const statusAntigo = jogador.presencas?.[diaSelecionado] || 'Falta';
      if (statusAntigo !== 'Confirmado' && status === 'Confirmado') {
        await incrementarPresencaHistorica(jogador.id, 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } else if (statusAntigo === 'Confirmado' && status !== 'Confirmado') {
        await incrementarPresencaHistorica(jogador.id, -1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      await updateJogador(jogador.id, { 
        [`presencas.${diaSelecionado}`]: status
      });
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  };

  const pagarAvulso = (jogador) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Confirmar Pagamento',
      `Registrar o pagamento de R$${valorAvulso} do avulso ${jogador.nome}?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, registrar', onPress: async () => {
            try {
              await updateJogador(jogador.id, { diariaPaga: true });
              await registrarOperacaoFinanceira('ENTRADA_AVULSO', valorAvulso, `Pago: ${jogador.nome}`, activeGroupId);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (err) {
              Alert.alert('Erro', err.message);
            }
          }
        }
      ]
    );
  };

  // "Cobrar Presença" — notifica todos via WhatsApp (paridade legado)
  const notificarTodos = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const msg = `🏐 *VOLEIZIN: Confirme sua Presença!* 🏐\n\nFala galera de ${diaSelecionado}!\n\nPor favor, confirma ou cancela sua presença no jogo hoje!\n\nJá confirmados: *${totalConfirmados.total}* 🔥\n\nBora! 💪`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('Erro', 'WhatsApp não instalado.')
    );
  };

  return (
    <ScrollView
      className="flex-1 bg-[#0b0f1a]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Card "Próximo Jogo" (paridade legado) ── */}
        <View
          style={{ marginTop: Math.max(insets.top, 20) }}
          className="bg-slate-800/45 p-5 rounded-2xl border border-white/5 mb-4"
        >
          <View className="flex-row items-center gap-2 mb-4">
            <FontAwesome5 name="calendar-check" size={16} color="#10b981" />
            <Text className="text-xl font-bold text-white ml-2">Próximo Jogo</Text>
          </View>

          {/* Seletor de Dias com data (paridade legado) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-4"
            contentContainerStyle={{ gap: 8 }}
          >
            {diasDaSemana.map(dia => {
              const isActive = diaSelecionado === dia;
              return (
                <TouchableOpacity
                  key={dia}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDiaSelecionado(dia);
                  }}
                  className={`min-w-[80px] py-3 rounded-xl font-bold flex-col items-center ${
                    isActive
                      ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30'
                      : 'bg-slate-800 border border-slate-700/50'
                  }`}
                >
                  <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                    {dia.substring(0, 3).toUpperCase()}
                  </Text>
                  <Text className={`text-[9px] mt-1 ${isActive ? 'text-white/75' : 'text-slate-500'}`}>
                    {descobrirProximaData(dia)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Botão "Atualizar Lista" (paridade legado) */}
          <TouchableOpacity
            onPress={onRefresh}
            className="w-full bg-emerald-500 py-3 rounded-xl items-center shadow-lg shadow-emerald-500/30 active:scale-95"
          >
            <Text className="text-white font-bold">Atualizar Lista</Text>
          </TouchableOpacity>
        </View>

        {/* ── Lista de Jogadores (paridade legado) ── */}
        {jogadoresDoDia.length > 0 && (
          <View className="bg-slate-800/45 p-5 rounded-2xl border border-white/5">

            {/* Cabeçalho com totais + botão Cobrar Presença */}
            <View className="mb-4">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="font-bold text-white">
                  Confirmados:{' '}
                  <Text className="text-emerald-400 text-xl">{totalConfirmados.total}</Text>
                </Text>
                <TouchableOpacity
                  onPress={notificarTodos}
                  className="flex-row items-center gap-1.5 bg-slate-800 border border-slate-600 px-3 py-1.5 rounded-xl"
                >
                  <FontAwesome5 name="whatsapp" size={12} color="#10b981" />
                  <Text className="text-xs text-emerald-400 font-bold ml-1">Cobrar Presença</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-3">
                <Text className="text-xs font-bold text-slate-400">
                  Mensalistas: <Text className="text-emerald-400">{totalConfirmados.mensalista}</Text>
                </Text>
                <Text className="text-xs font-bold text-slate-400">
                  Avulsos: <Text className="text-amber-400">{totalConfirmados.avulso}</Text>
                </Text>
              </View>
            </View>

            {/* Lista de jogadores */}
            <View className="space-y-2">
              {jogadoresDoDia.map(j => {
                const statusDia = j.presencas?.[diaSelecionado] || 'Falta';
                const isConfirmado = statusDia === 'Confirmado';
                const isFalta = statusDia === 'Falta';
                
                const isMensalistaDesteDia = j.tipo === 'MENSALISTA' && (j.diasMensalista || []).includes(diaSelecionado);
                const isAvulsoDesteDia = !isMensalistaDesteDia;
                const avulsoNaoPago = isAvulsoDesteDia && !j.diariaPaga;

                return (
                  <View
                    key={j.id}
                    className="flex-row items-center justify-between gap-2 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"
                  >
                    {/* Info do jogador */}
                    <View className="flex-1 min-w-0">
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text
                          numberOfLines={1}
                          className={`font-semibold ${
                            isConfirmado ? 'text-emerald-400' :
                            isFalta ? 'text-red-400 line-through opacity-50' :
                            'text-slate-200'
                          }`}
                        >
                          {j.nome}
                        </Text>
                        {/* Badge de tipo */}
                        {isConfirmado && (
                          <View className={`px-1.5 py-0.5 rounded ${
                            isAvulsoDesteDia
                              ? 'bg-amber-500/20'
                              : 'bg-emerald-500/20'
                          }`}>
                            <Text className={`text-[9px] font-black uppercase ${
                              isAvulsoDesteDia ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {isAvulsoDesteDia ? 'Avulso' : 'Mensalista'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[10px] text-slate-400 uppercase tracking-wider">
                        {j.tipo} | ⭐ {j.nivel || 3}
                      </Text>
                    </View>

                    {/* Ações */}
                    <View className="flex-row items-center gap-1.5">
                      {/* Botão Pagar Avulso */}
                      {isAvulsoDesteDia && !j.diariaPaga && (
                        <TouchableOpacity
                          onPress={() => pagarAvulso(j)}
                          className="bg-amber-500 px-2 py-1.5 rounded-xl shadow-lg shadow-amber-500/20 border border-amber-400/50"
                        >
                          <Text className="text-white font-black text-[9px] uppercase">
                            💰 R${valorAvulso}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Badge "PAGO ✅" */}
                      {isAvulsoDesteDia && j.diariaPaga && (
                        <View className="bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                          <Text className="text-[9px] font-black text-amber-400">PAGO ✅</Text>
                        </View>
                      )}

                      {/* Botões Vou / Falto */}
                      <TouchableOpacity
                        onPress={() => marcar(j, 'Confirmado')}
                        disabled={avulsoNaoPago}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                          isConfirmado
                            ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-700'
                        } ${avulsoNaoPago ? 'opacity-30' : ''}`}
                      >
                        <Text className={`font-semibold text-sm ${isConfirmado ? 'text-white' : 'text-slate-300'}`}>
                          Vou
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => marcar(j, 'Falta')}
                        className={`px-3 py-1.5 rounded-xl ${
                          isFalta
                            ? 'bg-red-500 shadow-lg shadow-red-500/20'
                            : 'bg-slate-700'
                        }`}
                      >
                        <Text className={`font-semibold text-sm ${isFalta ? 'text-white' : 'text-slate-300'}`}>
                          Falto
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Estado vazio */}
        {!carregando && jogadoresDoDia.length === 0 && (
          <View className="bg-slate-800/45 p-5 rounded-2xl border border-white/5 items-center py-16">
            <FontAwesome5 name="users-slash" size={40} color="#1e293b" />
            <Text className="text-slate-600 font-bold mt-4 uppercase tracking-widest text-xs text-center">
              Nenhum atleta cadastrado para {diaSelecionado}
            </Text>
          </View>
        )}

        {carregando && (
          <ActivityIndicator size="large" color="#10b981" style={{ marginVertical: 40 }} />
        )}

      </Animated.View>
    </ScrollView>
  );
}
