import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, RefreshControl, ActivityIndicator, Linking, Animated, Modal } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { subscribeJogadores, getSaldoGlobalEquipamentos, saveConfigFinanceira, getConfigFinanceira, registrarSaidaCaixa, registrarEntradaCaixa, updateJogador } from '../services/jogadorService';
import { registrarLog } from '../services/historyService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Firestore usa números; 0 é válido — não usar `||` que apaga o zero. */
const strCampoCusto = (v) => (v !== undefined && v !== null ? String(v) : '');

/** Date do mês exibido no seletor (offset relativo ao mês civil atual), fixado no dia 1
 *  para não "pular" meses em dias 29-31 por overflow do setMonth. */
const dataMesComOffset = (offset) => {
  const agora = new Date();
  return new Date(agora.getFullYear(), agora.getMonth() + offset, 1);
};

/** YYYY-MM do mês exibido no seletor (offset relativo ao mês civil atual). */
const yyyymmFromMesOffset = (offset) => {
  const d = dataMesComOffset(offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/** Nome localizado (ex.: "Setembro de 2026") do mês exibido no seletor. */
const nomeMesComOffset = (offset) => dataMesComOffset(offset)
  .toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  .replace(/^\w/, (c) => c.toUpperCase());

import { agruparPendenciasPorJogador, computarFechamento } from '../utils/financeiroUtils';
const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function FinanceiroScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId } = useSession();
  const [elenco, setElenco] = useState([]);
  const [saldoAvulsos, setSaldoAvulsos] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));
  const [pagamentoEmAndamentoId, setPagamentoEmAndamentoId] = useState(null);

  // Configuração de custos
  const [custos, setCustos] = useState({
    Segunda: '', Terça: '', Quarta: '', Quinta: '',
    Sexta: '', Sábado: '', Domingo: '', Avulso: '10'
  });

  // Resultado do fechamento (rateio)
  const [fechamento, setFechamento] = useState(null);
  const [statusMes, setStatusMes] = useState('Em Aberto');
  const pendenciasPorJogador = agruparPendenciasPorJogador(fechamento);

  // Seletor de mês (paridade legado: ◀ Mês Referência ▶) — offset 0 = mês civil atual
  const [mesOffset, setMesOffset] = useState(0);

  /** Mock Data grava `autoIniciarRateioMock` na config para abrir o rateio ao entrar na tela. */
  const [autoRateioMockRequested, setAutoRateioMockRequested] = useState(false);
  const consumiuAutoRateioMockRef = useRef(false);

  // Estados do Modal de Operação de Caixa
  const [modalOp, setModalOp] = useState({ visible: false, tipo: '' });
  const [modalVal, setModalVal] = useState('');
  const [modalDesc, setModalDesc] = useState('');

  const mesRef = useMemo(() => nomeMesComOffset(mesOffset), [mesOffset]);

  const persistirMesReferencia = useCallback(
    (offset) => {
      if (!activeGroupId) return;
      const strMes = nomeMesComOffset(offset);
      
      saveConfigFinanceira(activeGroupId, strMes, {
        mesReferenciaOffset: offset,
        mesReferenciaYYYYMM: yyyymmFromMesOffset(offset),
      }).catch(() => {});
    },
    [activeGroupId]
  );

  const carregarDados = useCallback(async () => {
    if (!activeGroupId) return;
    try {
      const s = await getSaldoGlobalEquipamentos(activeGroupId);
      setSaldoAvulsos(s);

      const strMesAtual = nomeMesComOffset(mesOffset);
      const conf = await getConfigFinanceira(activeGroupId, strMesAtual);
      
      const novosCustos = {
        Segunda: strCampoCusto(conf.Segunda),
        Terça: strCampoCusto(
          conf.Terca !== undefined && conf.Terca !== null ? conf.Terca : conf.Terça
        ),
        Quarta: strCampoCusto(conf.Quarta),
        Quinta: strCampoCusto(conf.Quinta),
        Sexta: strCampoCusto(conf.Sexta),
        Sábado: strCampoCusto(
          conf.Sabado !== undefined && conf.Sabado !== null ? conf.Sabado : conf.Sábado
        ),
        Domingo: strCampoCusto(conf.Domingo),
        Avulso: conf.Avulso !== undefined && conf.Avulso !== null ? String(conf.Avulso) : '10',
      };
      
      setCustos(novosCustos);
      setStatusMes(conf.status || 'Em Aberto');
      
      const temCustoSempre = diasDaSemana.some(
        (d) => (parseFloat(String(novosCustos[d]).replace(',', '.')) || 0) > 0
      );
      
      // Auto-inicia o rateio se o mês de referência sendo carregado já possuir valores configurados,
      // recriando o comportamento de 'checkFinanceiro' do legado.
      if (temCustoSempre || conf.autoIniciarRateioMock === true) {
        consumiuAutoRateioMockRef.current = false;
        setAutoRateioMockRequested(true);
      } else {
        consumiuAutoRateioMockRef.current = false;
        setAutoRateioMockRequested(false);
        setFechamento(null); // Remove o rateio caso esteja navegando para um mês em branco ou acabou de sofrer um Zerar Grupo
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [activeGroupId, mesOffset]);

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (dados) => setElenco(dados));
    carregarDados();
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();
    return () => unsub();
  }, [activeGroupId, carregarDados]);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [carregarDados])
  );

  useEffect(() => {
    if (!autoRateioMockRequested || consumiuAutoRateioMockRef.current) return;
    if (loading) return;
    if (elenco.length === 0) return;
    const temCusto = diasDaSemana.some(
      (d) => (parseFloat(String(custos[d]).replace(',', '.')) || 0) > 0
    );
    if (!temCusto) return;

    consumiuAutoRateioMockRef.current = true;
    setAutoRateioMockRequested(false);
    const novoFechamento = computarFechamento(custos, elenco, mesRef, statusMes);
    setFechamento(novoFechamento);

    // Persiste o status se houver mudança relevante (ex: agora está Pago Totalmente)
    if (activeGroupId && novoFechamento.statusGeral !== statusMes) {
       setStatusMes(novoFechamento.statusGeral);
       saveConfigFinanceira(activeGroupId, mesRef, { status: novoFechamento.statusGeral }).catch(() => {});
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Agora remove o token mock (se existir) mas mantem as configuracoes
    if (activeGroupId && custos.autoIniciarRateioMock) {
      saveConfigFinanceira(activeGroupId, mesRef, { autoIniciarRateioMock: false }).catch(() => {});
    }
  }, [autoRateioMockRequested, loading, elenco, custos, activeGroupId, mesRef]);

  const salvarConfigSomente = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      setLoading(true);
      await saveConfigFinanceira(activeGroupId, mesRef, {
        ...custos,
        Terca: custos.Terça,
        Sabado: custos.Sábado,
        mesReferenciaOffset: mesOffset,
        mesReferenciaYYYYMM: yyyymmFromMesOffset(mesOffset),
        status: statusMes
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Salvo!', 'Configuração de custos salva com sucesso!');
    } catch (e) { Alert.alert('Erro', e.message); }
    finally { setLoading(false); }
  };

  const calcularFechamento = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const novoFechamento = computarFechamento(custos, elenco, mesRef, statusMes);
    setFechamento(novoFechamento);
    
    if (activeGroupId && novoFechamento.statusGeral !== statusMes) {
      setStatusMes(novoFechamento.statusGeral);
      saveConfigFinanceira(activeGroupId, mesRef, { status: novoFechamento.statusGeral }).catch(() => {});
    }
  };

  const fazerPagamentoConsolidado = async (jogador) => {
    if (pagamentoEmAndamentoId) return;
    const marcarComoPago = jogador.totalPendente > 0;
    const diasAtualizar = marcarComoPago ? jogador.diasPendentes : jogador.diasPagos;
    if (!diasAtualizar.length) return;

    setPagamentoEmAndamentoId(jogador.id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const pagamentosAtualizados = Object.fromEntries(diasAtualizar.map(dia => [
        `pagamentosMensais.${dia}_${mesRef}`,
        marcarComoPago
      ]));
      await updateJogador(jogador.id, pagamentosAtualizados, activeGroupId);
      const elencoAtualizado = elenco.map(item => item.id === jogador.id
        ? {
            ...item,
            pagamentosMensais: {
              ...(item.pagamentosMensais || {}),
              ...Object.fromEntries(diasAtualizar.map(dia => [`${dia}_${mesRef}`, marcarComoPago]))
            }
          }
        : item
      );
      setElenco(elencoAtualizado);

      const statusParaCalcular = statusMes === 'Pago Totalmente' && !marcarComoPago ? 'Em Aberto' : statusMes;
      const novoFechamento = computarFechamento(custos, elencoAtualizado, mesRef, statusParaCalcular);
      setFechamento(novoFechamento);
      if (activeGroupId && novoFechamento.statusGeral !== statusMes) {
        setStatusMes(novoFechamento.statusGeral);
        await saveConfigFinanceira(activeGroupId, mesRef, { status: novoFechamento.statusGeral });
      }
      await registrarLog(
        'FINANCEIRO',
        `Mensalidade consolidada de ${jogador.nome} marcada como: ${marcarComoPago ? 'PAGO' : 'PENDENTE'}`,
        0,
        activeGroupId
      );
    } catch (e) {
      Alert.alert('Erro', `Não foi possível atualizar o pagamento: ${e.message}`);
    } finally {
      setPagamentoEmAndamentoId(null);
    }
  };

  const compartilharPendencias = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const pendencias = pendenciasPorJogador.filter(jogador => jogador.totalPendente > 0);
    const totalGeral = pendencias.reduce((soma, jogador) => soma + jogador.totalPendente, 0);
    const lista = pendencias
      .map((jogador) => `• ${jogador.nome}: *${jogador.totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`)
      .join('\n');
    const msg = `🏐 *VOLEIZIN — Cobranças de ${mesRef}* 🏐\n\n${lista}\n\n*Total pendente: ${totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}*`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(msg)}`).catch(() =>
      Alert.alert('Erro', 'WhatsApp não instalado.')
    );
  };

  // Abrir Modal de Operação
  const abrirModalOp = (tipo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setModalVal('');
    setModalDesc('');
    setModalOp({ visible: true, tipo });
  };

  // Confirmar Operação (Entrada/Saída) do Modal
  const confirmarOperacao = async () => {
    const v = parseFloat(modalVal.replace(',', '.'));
    if (isNaN(v) || v <= 0) return Alert.alert('Erro', 'Valor inválido.');
    
    try {
      setLoading(true);
      if (modalOp.tipo === 'ENTRADA') {
        await registrarEntradaCaixa(v, modalDesc || 'Entrada Manual', activeGroupId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sucesso', 'Entrada registrada com sucesso!');
      } else {
        await registrarSaidaCaixa(v, modalDesc || 'Gasto em Equipamentos', activeGroupId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Sucesso', 'Saída registrada com sucesso!');
      }
      setModalOp({ visible: false, tipo: '' });
      carregarDados();
    } catch (e) {
      Alert.alert('Erro', e.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); carregarDados(); };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-[#0b0f1a] items-center justify-center">
        <ActivityIndicator size="large" color="#facc15" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-[#0b0f1a]"
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#facc15" />}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* ── Seletor de Mês (paridade legado) ── */}
        <View
          style={{ marginTop: Math.max(insets.top, 20) }}
          className="flex-row items-center justify-between bg-slate-800/50 rounded-2xl p-2 border border-slate-700/50 mb-4"
        >
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFechamento(null); // Aqui: limpa taxa atual no mês novo
              setMesOffset((m) => {
                const next = m - 1;
                persistirMesReferencia(next);
                return next;
              });
            }}
            className="w-10 h-10 rounded-xl bg-slate-700 items-center justify-center"
          >
            <FontAwesome5 name="chevron-left" size={12} color="#cbd5e1" />
          </TouchableOpacity>
          <View className="items-center flex-1 px-2 min-w-0">
            <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mês de Referência</Text>
            <Text className="text-lg font-black text-white text-center" numberOfLines={2}>
              {mesRef}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFechamento(null); // Aqui: limpa taxa atual no mês novo
              setMesOffset((m) => {
                const next = m + 1;
                persistirMesReferencia(next);
                return next;
              });
            }}
            className="w-10 h-10 rounded-xl bg-slate-700 items-center justify-center"
          >
            <FontAwesome5 name="chevron-right" size={12} color="#cbd5e1" />
          </TouchableOpacity>
        </View>

        {/* ── Formulário de Custos (quando não há fechamento) ── */}
        {!fechamento && (
          <View className="bg-slate-800/45 p-5 rounded-2xl border border-white/5 mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <FontAwesome5 name="wallet" size={14} color="#facc15" />
              <Text className="text-xl font-bold text-white ml-2">Novo Fechamento</Text>
            </View>

            <Text className="text-[10px] text-slate-400 font-bold uppercase mb-3">Configure os custos por dia:</Text>

            <View className="space-y-3 mb-4">
              {diasDaSemana.map(dia => (
                <View key={dia} className="flex-row items-center gap-2">
                  <Text className="w-20 text-xs font-bold text-slate-300">{dia}</Text>
                  <View className="flex-1 relative">
                    <Text className="absolute left-3 top-3 text-slate-400 font-bold text-sm z-10">R$</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={custos[dia]}
                      onChangeText={val => setCustos({ ...custos, [dia]: val })}
                      placeholder="0,00"
                      placeholderTextColor="#475569"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 text-white font-bold text-sm"
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Valor Avulso */}
            <View className="pt-3 border-t border-slate-700/50 mb-4">
              <View className="flex-row items-center gap-2">
                <Text className="w-20 text-xs font-bold text-amber-500">Valor Avulso</Text>
                <View className="flex-1 relative">
                  <Text className="absolute left-3 top-3 text-amber-500/50 font-bold text-sm z-10">R$</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={custos.Avulso}
                    onChangeText={val => setCustos({ ...custos, Avulso: val })}
                    placeholder="10,00"
                    placeholderTextColor="#78350f"
                    className="w-full bg-slate-800/80 border border-amber-500/30 rounded-xl py-2.5 pl-10 text-amber-400 font-black text-sm"
                  />
                </View>
              </View>
              <Text className="text-[9px] text-slate-500 mt-1 ml-24 italic">* Valor cobrado por dia de cada avulso/convidado.</Text>
            </View>

            <View className="flex-row gap-2 mt-2">
              <TouchableOpacity
                onPress={salvarConfigSomente}
                className="flex-1 bg-slate-700 py-3 rounded-xl flex-row justify-center items-center gap-2"
              >
                <FontAwesome5 name="save" size={13} color="#cbd5e1" />
                <Text className="text-slate-300 font-bold text-sm ml-2">Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={calcularFechamento}
                className="flex-[2] bg-yellow-500 py-3 rounded-xl flex-row justify-center items-center gap-2 active:scale-95 shadow-lg shadow-yellow-500/30"
              >
                <FontAwesome5 name="calculator" size={13} color="#0b0f1a" />
                <Text className="text-slate-900 font-bold text-sm ml-2">Iniciar Rateio</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Resumo após fechamento (paridade legado: 2 cards) ── */}
        {fechamento && (
          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-slate-800/45 p-4 rounded-2xl border-b-2 border-emerald-500/30 border border-white/5">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-[10px] text-slate-400 font-bold uppercase leading-tight">Arrecadado{'\n'}(Quadra)</Text>
                <View className={`px-1.5 py-0.5 rounded border text-center ${fechamento.statusGeral === 'Pago Totalmente' ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-amber-500/20 border-amber-500/50'}`}>
                  <Text className={`text-[8px] font-black uppercase ${fechamento.statusGeral === 'Pago Totalmente' ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {fechamento.statusGeral}
                  </Text>
                </View>
              </View>
              <Text className="text-xl font-black text-emerald-400">
                R$ {fechamento.totalArrecadadoMensalistas.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            <View className="flex-1 bg-slate-800/45 p-4 rounded-2xl border-b-2 border-slate-500/30 border border-white/5">
              <Text className="text-[10px] text-slate-400 font-bold uppercase mb-2">Custo Total</Text>
              <Text className="text-xl font-black text-white">
                R$ {fechamento.metaArrecadacao.toFixed(2).replace('.', ',')}
              </Text>
            </View>
          </View>
        )}

        {/* ── Rateio Mensalistas ── */}
        {fechamento && (
          <View className="bg-slate-800/45 p-5 rounded-2xl border border-emerald-500/20 mb-3">
            <View className="flex-row items-center justify-between gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-white font-black">Total pendente por jogador</Text>
                <Text className="text-slate-400 text-[10px] mt-1">Valores somados entre todos os dias do mês.</Text>
              </View>
              <TouchableOpacity
                onPress={compartilharPendencias}
                disabled={!pendenciasPorJogador.some(jogador => jogador.totalPendente > 0)}
                className={`px-3 py-2 rounded-xl flex-row items-center gap-2 ${pendenciasPorJogador.some(jogador => jogador.totalPendente > 0) ? 'bg-emerald-500/20' : 'bg-slate-700 opacity-50'}`}
              >
                <FontAwesome5 name="whatsapp" size={14} color="#34d399" />
                <Text className="text-emerald-300 text-[10px] font-black">ENVIAR LISTA</Text>
              </TouchableOpacity>
            </View>
            {pendenciasPorJogador.length ? pendenciasPorJogador.map((jogador) => (
              <View key={jogador.id} className={`flex-row items-center justify-between gap-3 p-3 rounded-xl mb-2 ${jogador.totalPendente > 0 ? 'bg-slate-900/50' : 'bg-emerald-950/30'}`}>
                <View className="flex-1">
                  <Text className="text-slate-100 text-xs font-bold">{jogador.nome}</Text>
                  <Text className="text-slate-500 text-[9px] mt-1">
                    {jogador.totalPendente > 0 ? `Pendente: ${jogador.diasPendentes.join(' · ')}` : `Pago: ${jogador.diasPagos.join(' · ')}`}
                  </Text>
                  <Text className={`font-black text-sm mt-1 ${jogador.totalPendente > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>
                    {jogador.totalPendente.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => fazerPagamentoConsolidado(jogador)}
                  disabled={Boolean(pagamentoEmAndamentoId)}
                  className={`px-3 py-2 rounded-xl ${jogador.totalPendente > 0 ? 'bg-emerald-500/20' : 'bg-slate-700'}`}
                >
                  <Text className={`text-[10px] font-black ${jogador.totalPendente > 0 ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {jogador.totalPendente > 0 ? 'Marcar pago' : 'Reabrir'}
                  </Text>
                </TouchableOpacity>
              </View>
            )) : (
              <Text className="text-emerald-300 text-xs font-bold">Não há mensalidades pendentes neste mês.</Text>
            )}
          </View>
        )}

        {/* ── Rateio Mensalistas ── */}
        {fechamento && (
          <View className="bg-slate-800/45 p-5 rounded-2xl border-t-2 border-t-indigo-500 border border-white/5 mb-3">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <FontAwesome5 name="coins" size={13} color="#818cf8" />
                <Text className="text-indigo-400 font-bold ml-2">Rateio Mensalistas</Text>
              </View>
              <View className="bg-indigo-500/20 px-2 py-1 rounded">
                <Text className="text-[10px] text-indigo-300 font-black uppercase">Quadra</Text>
              </View>
            </View>
            <View className="flex-row justify-between items-end">
              <View>
                <Text className="text-[10px] text-slate-400 font-bold uppercase">Meta de Arrecadação</Text>
                <Text className="text-2xl font-black text-white">R$ {fechamento.metaArrecadacao.toFixed(2).replace('.', ',')}</Text>
                <Text className="text-[9px] text-indigo-300 font-bold mt-1">
                  Já Arrecadado: R$ {fechamento.totalArrecadadoMensalistas.toFixed(2).replace('.', ',')}
                </Text>
              </View>
              <Text className="text-[10px] text-slate-500 italic text-right" style={{ maxWidth: 140 }}>
                Valor arrecadado com as mensalidades para cobrir os custos.
              </Text>
            </View>
          </View>
        )}

        {/* ── Caixa de Equipamentos (Avulsos) ── */}
        {fechamento && (
          <View className="bg-slate-800/45 p-5 rounded-2xl border-t-2 border-t-amber-500 border border-white/5 mb-3">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <FontAwesome5 name="volleyball-ball" size={13} color="#f59e0b" />
                <Text className="text-amber-500 font-bold ml-2">Caixa de Equipamentos</Text>
              </View>
              <View className="bg-amber-500/20 px-2 py-1 rounded">
                <Text className="text-[10px] text-amber-300 font-black uppercase">Avulsos</Text>
              </View>
            </View>
            <View className="flex-row justify-between items-end mb-3">
              <View>
                <Text className="text-[10px] text-slate-400 font-bold uppercase">Total para Compras</Text>
                <Text className="text-2xl font-black text-white">R$ {saldoAvulsos.toFixed(2).replace('.', ',')}</Text>
              </View>
              <Text className="text-[10px] text-slate-500 italic text-right" style={{ maxWidth: 140 }}>
                Verba dos avulsos conforme diária configurada (R${' '}
                {(parseFloat(String(custos.Avulso).replace(',', '.')) || 0).toFixed(2).replace('.', ',')}).
              </Text>
            </View>
            <View className="flex-row justify-between items-center pt-3 border-t border-amber-500/30">
              <Text className="text-[10px] text-slate-500 font-bold" style={{ maxWidth: 140 }}>
                Gestão de verba extra para equipamentos.
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => abrirModalOp('ENTRADA')}
                  className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex-row items-center gap-1"
                >
                  <FontAwesome5 name="plus-circle" size={11} color="#10b981" />
                  <Text className="text-emerald-400 font-bold text-xs ml-1">Entrada</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => abrirModalOp('SAIDA')}
                  className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl flex-row items-center gap-1"
                >
                  <FontAwesome5 name="minus-circle" size={11} color="#ef4444" />
                  <Text className="text-red-400 font-bold text-xs ml-1">Saída</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ── Botão Corrigir/Refazer (paridade legado) ── */}
        {fechamento && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFechamento(null); }}
            className="flex-row justify-center items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-700/50 bg-slate-800/20 mb-4 self-center"
          >
            <FontAwesome5 name="undo" size={10} color="#64748b" />
            <Text className="text-[10px] text-slate-500 font-bold uppercase ml-1">Corrigir / Refazer Cálculo</Text>
          </TouchableOpacity>
        )}

        {/* Modal de Operação de Caixa (Substitui o Alert.prompt para funcionar no Android) */}
        <Modal visible={modalOp.visible} transparent animationType="fade">
          <View className="flex-1 justify-center items-center bg-black/80 px-4">
            <View className="bg-slate-800 w-full p-6 rounded-3xl border border-white/10">
              <View className="flex-row items-center gap-2 mb-6">
                <FontAwesome5 name={modalOp.tipo === 'ENTRADA' ? "plus-circle" : "minus-circle"} size={20} color={modalOp.tipo === 'ENTRADA' ? "#10b981" : "#ef4444"} />
                <Text className="text-white text-xl font-black">
                  {modalOp.tipo === 'ENTRADA' ? 'Entrada Manual' : 'Liquidar Gastos'}
                </Text>
              </View>
              
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Valor (R$)</Text>
              <TextInput
                keyboardType="numeric"
                value={modalVal}
                onChangeText={setModalVal}
                placeholder="Ex: 50,00"
                placeholderTextColor="#475569"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 px-4 text-white font-bold text-lg mb-4"
              />
              
              <Text className="text-slate-400 text-xs font-bold uppercase mb-2">Descrição</Text>
              <TextInput
                value={modalDesc}
                onChangeText={setModalDesc}
                placeholder={modalOp.tipo === 'ENTRADA' ? 'Ex: Doação / Venda de Bolas' : 'Ex: Compra de Bolas / Rede'}
                placeholderTextColor="#475569"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 px-4 text-white font-bold text-sm mb-8"
              />
              
              <View className="flex-row gap-3">
                <TouchableOpacity 
                  onPress={() => setModalOp({ visible: false, tipo: '' })}
                  className="flex-1 bg-slate-700 py-3.5 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-sm uppercase">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={confirmarOperacao}
                  className={`flex-1 py-3.5 rounded-xl items-center shadow-lg ${modalOp.tipo === 'ENTRADA' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-red-500 shadow-red-500/30'}`}
                >
                  <Text className="text-white font-bold text-sm uppercase tracking-wider">Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </Animated.View>
    </ScrollView>
  );
}
