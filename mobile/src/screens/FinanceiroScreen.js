import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking, TextInput, Alert, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores, updateJogador, registrarOperacaoFinanceira, getSaldoGlobalEquipamentos } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';

export default function FinanceiroScreen() {
  const { activeGroupId, logout } = useSession();
  const [mesReferencia] = useState('Abril/2026');
  const [custoQuadra, setCustoQuadra] = useState('150');
  const [saldoGlobal, setSaldoGlobal] = useState(0);
  const [showAddDespesa, setShowAddDespesa] = useState(false);
  const [descDespesa, setDescDespesa] = useState('');
  const [valorDespesa, setValorDespesa] = useState('');
  
  const [elenco, setElenco] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDados = async () => {
    if (!activeGroupId) return;
    const novoSaldo = await getSaldoGlobalEquipamentos(activeGroupId);
    setSaldoGlobal(novoSaldo);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (dados) => {
      setElenco(dados);
      setCarregando(false);
    });
    carregarDados();
    return () => unsub();
  }, [activeGroupId]);

  const handleRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const handleLancarDespesa = async () => {
    if (!valorDespesa || !descDespesa) return Alert.alert('Erro', 'Preencha valor e descrição');
    try {
      await registrarOperacaoFinanceira('SAIDA_DESPESA', parseFloat(valorDespesa), descDespesa, activeGroupId);
      await carregarDados();
      setShowAddDespesa(false);
      setValorDespesa(''); setDescDespesa('');
      Alert.alert('Sucesso', 'Gasto registrado e abatido do fundo!');
    } catch (e) {
      Alert.alert('Erro', e.message);
    }
  };

  const alternarMensalidade = async (jogador) => {
    await updateJogador(jogador.id, { mensalidadePaga: !jogador.mensalidadePaga }, activeGroupId);
  };

  if (carregando && !refreshing) {
    return (
      <View className="flex-1 bg-[#0b0f1a] justify-center items-center">
        <ActivityIndicator size="large" color="#fbbf24" />
      </View>
    );
  }

  const mensalistas = elenco.filter(j => j.tipo === 'MENSALISTA');
  const custoTotal = parseFloat(custoQuadra) || 0;
  const valorUnitario = mensalistas.length > 0 ? (custoTotal / mensalistas.length) : 0;
  const mensalistasPagos = mensalistas.filter(j => j.mensalidadePaga).length;

  return (
    <ScrollView 
      className="flex-1 bg-[#0b0f1a]" 
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fbbf24" />}
    >
      <View className="flex-row justify-end mb-4">
        <TouchableOpacity onPress={logout} className="bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/30 flex-row items-center">
          <FontAwesome5 name="door-open" size={10} color="#ef4444" />
          <Text className="text-red-400 text-[10px] font-bold ml-1.5 uppercase tracking-tighter">Sair do Grupo</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-slate-800 p-5 rounded-2xl border border-slate-700/50 mb-5 shadow-md">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mês Referência</Text>
            <Text className="text-xl font-black text-white">{mesReferencia}</Text>
          </View>
          <View className="items-end">
            <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-right">Custo Quadra</Text>
            <View className="flex-row items-center border-b border-indigo-500 pb-1">
               <Text className="text-indigo-400 font-bold mr-1">R$</Text>
               <TextInput 
                value={custoQuadra} 
                onChangeText={setCustoQuadra} 
                keyboardType="numeric" 
                style={{ color: 'white', fontSize: 20, fontWeight: '900', padding: 0 }} 
              />
            </View>
          </View>
        </View>
        <View className="bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 items-center">
           <Text className="text-[10px] text-indigo-300 font-bold text-center">RATEIO: R$ {valorUnitario.toFixed(2)} por mensalista</Text>
        </View>
      </View>

      <View className="bg-slate-800 p-5 rounded-3xl border-t-2 border-amber-500 shadow-md mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View className="flex-row items-center">
            <FontAwesome5 name="toolbox" size={16} color="#fbbf24" />
            <Text className="font-bold text-amber-500 ml-2">Fundo Equipamentos</Text>
          </View>
          <TouchableOpacity onPress={() => setShowAddDespesa(!showAddDespesa)} className="bg-red-500/20 px-2 py-1 rounded border border-red-500/40">
            <Text className="text-[10px] text-red-400 font-bold uppercase">Lançar Gasto</Text>
          </TouchableOpacity>
        </View>

        {showAddDespesa && (
          <View className="bg-[#0b0f1a] p-3 rounded-xl mb-4 border border-red-500/20">
            <TextInput value={descDespesa} onChangeText={setDescDespesa} placeholder="Ex: Compra de 2 Bolas" placeholderTextColor="#64748b" className="bg-slate-800 p-2 rounded-lg text-white mb-2" />
            <View className="flex-row items-center">
              <TextInput value={valorDespesa} onChangeText={setValorDespesa} placeholder="Valor R$" placeholderTextColor="#64748b" keyboardType="numeric" className="bg-slate-800 p-2 rounded-lg text-white flex-1 mr-2" />
              <TouchableOpacity onPress={handleLancarDespesa} className="bg-red-600 px-4 py-2 rounded-lg">
                <Text className="text-white font-bold text-xs">OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="flex-row justify-between items-end">
          <View>
            <Text className="text-[10px] text-slate-400 font-bold uppercase">Saldo em Fundo</Text>
            <Text className={`text-4xl font-black ${saldoGlobal >= 0 ? 'text-white' : 'text-red-400'}`}>R$ {saldoGlobal.toFixed(2)}</Text>
          </View>
          <View className="bg-slate-900/50 p-2 rounded-xl">
             <Text className="text-[9px] text-slate-500 font-black uppercase text-center">Pagos: {mensalistasPagos}/{mensalistas.length}</Text>
          </View>
        </View>
      </View>

      <Text className="text-white font-black text-xs uppercase mb-3 ml-1 tracking-widest">Controle de Mensalidades</Text>
      <View className="bg-slate-800 p-2 rounded-3xl border border-slate-700/50 shadow-md">
        {mensalistas.length === 0 ? (
          <Text className="text-slate-500 italic p-4 text-center">Nenhum mensalista cadastrado.</Text>
        ) : (
          mensalistas.map((j) => (
            <View key={j.id} className="flex-row items-center justify-between p-3 bg-[#0b0f1a] rounded-2xl border border-slate-700/30 mb-2 shadow-sm">
              <View className="flex-1 pr-3">
                <Text numberOfLines={1} className={`font-bold text-sm ${j.mensalidadePaga ? 'text-emerald-400 line-through opacity-70' : 'text-slate-200'}`}>{j.nome}</Text>
                {!j.mensalidadePaga && <Text className="text-[8px] text-amber-500 font-black uppercase mt-0.5 tracking-tighter">Pendente • R$ {valorUnitario.toFixed(2)}</Text>}
              </View>
              <View className="flex-row items-center">
                {!j.mensalidadePaga && (
                  <TouchableOpacity 
                    onPress={() => Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`Fala ${j.nome}! Tudo certo? Passando pra lembrar o acerto da mensalidade R$ ${valorUnitario.toFixed(2)} deste mês!`)}`)}
                    className="w-10 h-10 bg-[#25D366]/10 items-center justify-center rounded-xl mr-2 border border-[#25D366]/20"
                  >
                    <FontAwesome5 name="whatsapp" size={16} color="#25D366" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  onPress={() => alternarMensalidade(j)}
                  className={`w-10 h-10 items-center justify-center rounded-xl border ${j.mensalidadePaga ? 'bg-emerald-500 border-emerald-400' : 'bg-slate-700 border-slate-600'}`}
                >
                  <FontAwesome5 name={j.mensalidadePaga ? "check" : "minus"} size={14} color={j.mensalidadePaga ? "white" : "#475569"} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}
