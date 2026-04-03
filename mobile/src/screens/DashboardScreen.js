import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, Linking } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { subscribeJogadores, getSaldoGlobalEquipamentos } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';

export default function DashboardScreen() {
  const { activeGroupId } = useSession();
  const [elenco, setElenco] = useState([]);
  const [saldoFundo, setSaldoFundo] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDados = async () => {
    if (!activeGroupId) return;
    const novoSaldo = await getSaldoGlobalEquipamentos(activeGroupId);
    setSaldoFundo(novoSaldo);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (dados) => {
      setElenco(dados);
      setLoading(false);
    });
    carregarDados();
    return () => unsub();
  }, [activeGroupId]);

  const handleRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const handleInvite = () => {
    const mensagem = `📢 *CONVITE VÔLEI* 📢\n\nFala galera! Participe do nosso grupo de vôlei no App!\n\n🔑 Código de Acesso: *${activeGroupId}*\n\nEntre no app e digite esse código para marcar presença e ver os times! 🏐🔥`;
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(mensagem)}`).catch(() => {
      Alert.alert("Erro", "Não foi possível abrir o WhatsApp.");
    });
  };

  // LÓGICA DE PROCESSAMENTO (PARIDADE GS)
  const hojeDate = new Date();
  const hojeStr = `${hojeDate.getDate().toString().padStart(2, '0')}/${(hojeDate.getMonth() + 1).toString().padStart(2, '0')}`;
  
  const aniversariantes = elenco.filter(j => j.dataNascimento === hojeStr);
  const totalJogadores = elenco.length;
  const mensalistasCount = elenco.filter(j => j.tipo === 'MENSALISTA').length;
  const mediaNivel = totalJogadores > 0 
    ? (elenco.reduce((acc, j) => acc + j.nivel, 0) / totalJogadores).toFixed(1) 
    : "0.0";

  const ranking = [...elenco]
    .filter(j => (j.historicoPresencas || 0) > 0)
    .sort((a, b) => b.historicoPresencas - a.historicoPresencas)
    .slice(0, 5);

  const devedores = elenco.filter(j => j.tipo === 'MENSALISTA' && !j.mensalidadePaga);

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-[#0b0f1a] justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-emerald-500 mt-4 font-bold text-lg">Carregando Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      className="flex-1 bg-[#0b0f1a]" 
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10b981" />}
    >
      {/* Header Centralizado */}
      <View className="items-center mb-6 mt-4">
        <View className="bg-slate-800 p-4 rounded-full mb-3 border border-slate-700 shadow-xl">
          <FontAwesome5 name="volleyball-ball" size={36} color="#34d399" />
        </View>
        <Text className="text-3xl font-extrabold text-emerald-400">VoleizinDosCria</Text>
        <Text className="text-slate-400 text-sm mt-1">Organização, Times e Finanças</Text>
        
        {/* Código do Grupo para Jogadores */}
        <View className="flex-row mt-4 space-x-2">
          <TouchableOpacity 
            onPress={async () => {
               await Clipboard.setStringAsync(activeGroupId);
               Alert.alert("Copiado!", "Código do vôlei copiado!");
            }}
            className="bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700 flex-row items-center"
          >
             <Text className="text-[10px] text-slate-400 font-bold uppercase mr-2">Código:</Text>
             <Text className="text-sm font-black text-emerald-400 tracking-widest">{activeGroupId}</Text>
             <FontAwesome5 name="copy" size={10} color="#34d399" style={{ marginLeft: 8 }} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleInvite}
            className="bg-emerald-500 px-4 py-2 rounded-full items-center justify-center"
          >
            <FontAwesome5 name="paper-plane" size={12} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Caixa de Aniversariantes */}
      {aniversariantes.length > 0 && (
        <View className="bg-slate-800 p-5 rounded-2xl border-l-4 border-pink-500 mb-4 shadow-md">
          <Text className="font-bold text-white mb-2 text-base">
             🎂 Aniversariantes de Hoje!
          </Text>
          <View className="flex-row flex-wrap mt-1">
            {aniversariantes.map(j => (
              <View key={j.id} className="bg-pink-500 px-3 py-1.5 mt-1 mr-2 rounded-full shadow border border-pink-400">
                <Text className="text-white text-xs font-bold">{j.nome}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cards Lado a Lado (Elenco e Nível) */}
      <View className="flex-row justify-between mb-4">
        <View className="flex-1 bg-slate-800 p-4 rounded-2xl border-l-4 border-blue-500 mr-2 shadow-md">
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Elenco</Text>
          <Text className="text-2xl font-black text-white mt-1">{totalJogadores}</Text>
          <Text className="text-[9px] text-blue-400 font-bold mt-1">{mensalistasCount} Mensalistas</Text>
        </View>
        <View className="flex-1 bg-slate-800 p-4 rounded-2xl border-l-4 border-emerald-500 ml-2 shadow-md">
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nível Médio</Text>
          <Text className="text-2xl font-black text-white mt-1">⭐ {mediaNivel}</Text>
          <Text className="text-[9px] text-emerald-400 font-bold mt-1">Escala 1 a 5</Text>
        </View>
      </View>

      {/* Fundo de Equipamentos (Resumo) */}
      <View className="bg-slate-800 p-5 rounded-2xl mb-4 shadow-md border-t-2 border-amber-500">
        <View className="flex-row justify-between items-center mb-2">
            <Text className="font-bold text-amber-400 text-base tracking-wide">💰 Fundo de Equipamentos</Text>
            <FontAwesome5 name="toolbox" size={14} color="#fbbf24" />
        </View>
        <Text className="text-3xl font-black text-white">R$ {saldoFundo.toFixed(2)}</Text>
        <Text className="text-[10px] text-slate-400 mt-1 uppercase">Saldo acumulado vitalício</Text>
      </View>

      {/* Pendências do Mês (Devedores vs Tudo Certo) */}
      {devedores.length > 0 ? (
        <View className="bg-slate-800 p-5 rounded-2xl border-l-4 border-red-500 mb-4 shadow-md">
           <Text className="font-bold text-red-400 text-base mb-3">⚠️ Pendências do Mês</Text>
           {devedores.map((j) => (
            <View key={j.id} className="flex-row justify-between items-center bg-slate-700 p-2.5 rounded-lg mb-1.5 border border-red-500/20">
               <Text className="text-sm font-bold text-slate-200">{j.nome}</Text>
               <View className="bg-red-500/20 px-2 py-0.5 rounded">
                  <Text className="text-[10px] text-red-400 font-black">PENDENTE</Text>
               </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="bg-slate-800 p-5 rounded-2xl border-l-4 border-emerald-500 mb-4 flex-row items-center shadow-md">
          <FontAwesome5 name="check-circle" size={24} color="#10b981" />
          <View className="ml-3">
             <Text className="text-sm font-bold text-white">Mensalidades em dia!</Text>
             <Text className="text-[10px] text-slate-400">Nenhum devedor encontrado no sistema.</Text>
          </View>
        </View>
      )}

      {/* Ranking Vitalício */}
      <View className="bg-slate-800 p-5 rounded-2xl shadow-md mb-4 border-t-4 border-amber-500">
         <Text className="font-bold text-amber-400 mb-4 text-base tracking-wide">👑 Ranking de Assiduidade</Text>
         {ranking.map((r, i) => (
           <View key={r.id} className="flex-row justify-between items-center p-3 bg-[#0b0f1a] mb-2 rounded-lg border border-slate-700">
             <View className="flex-row items-center">
               <Text className="text-xs font-black text-slate-500 w-6">#{i+1}</Text>
               <Text className="text-sm font-bold text-white ml-1">{r.nome}</Text>
             </View>
             <View className="flex-row items-center">
                <Text className="text-xs font-bold text-emerald-400 mr-2">{r.historicoPresencas} jogos</Text>
                <FontAwesome5 name="medal" size={10} color={i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : "#92400e"} />
             </View>
           </View>
         ))}
      </View>

    </ScrollView>
  );
}
