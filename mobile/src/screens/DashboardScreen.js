import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  
  // Dados de mock (teste) para criarmos todo o visual Premium do App
  const dashboardData = {
    aniversariantes: ["Carlos Mendonça"],
    statsJogadores: { total: 24, mensalistas: 16, mediaNivel: "3.5" },
    financeiro: {
      totalQuadra: 1240.00,
      totalEquipamentos: 350.00,
      totalGeral: 1590.00,
      saldoEmAberto: 45.00,
      devedores: [{ nome: "João Avulso", valor: 45.00, dia: "SEG" }]
    },
    ranking: [
      { nome: "Carlos", total: 12 },
      { nome: "Thiago", total: 11 },
      { nome: "Fernanda", total: 10 },
      { nome: "Miguel", total: 8 },
      { nome: "Laura", total: 7 }
    ],
    niveis: [
      { nivel: 1, qtd: 2 },
      { nivel: 2, qtd: 4 },
      { nivel: 3, qtd: 8 },
      { nivel: 4, qtd: 7 },
      { nivel: 5, qtd: 3 }
    ]
  };

  useEffect(() => {
    // Simulando o tempo de carregar os dados reais que virão da API/Firebase depois
    setTimeout(() => setLoading(false), 2000);
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-[#0b0f1a] justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-emerald-500 mt-4 font-bold text-lg">Carregando Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {/* Header Centralizado */}
      <View className="items-center mb-6 mt-4">
        <View className="bg-slate-800 p-4 rounded-full mb-3 border border-slate-700 shadow-xl">
          <FontAwesome5 name="volleyball-ball" size={36} color="#34d399" />
        </View>
        <Text className="text-3xl font-extrabold text-emerald-400">VoleizinDosCria</Text>
        <Text className="text-slate-400 text-sm mt-1">Organização, Times e Finanças</Text>
      </View>

      {/* Caixa de Aniversariantes */}
      {dashboardData.aniversariantes.length > 0 && (
        <View className="bg-slate-800 p-5 rounded-2xl border-l-4 border-pink-500 mb-4 shadow-md">
          <Text className="font-bold text-white mb-2 text-base">
             🎂 Aniversariantes de Hoje!
          </Text>
          <View className="flex-row flex-wrap mt-1">
            {dashboardData.aniversariantes.map(nome => (
              <View key={nome} className="bg-pink-500 px-3 py-1.5 mt-1 mr-2 rounded-full shadow border border-pink-400">
                <Text className="text-white text-xs font-bold">{nome}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cards Lado a Lado (Elenco e Nível) */}
      <View className="flex-row justify-between mb-4">
        <View className="flex-1 bg-slate-800 p-4 rounded-2xl border-l-4 border-blue-500 mr-2 shadow-md">
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Elenco</Text>
          <Text className="text-2xl font-black text-white mt-1">{dashboardData.statsJogadores.total}</Text>
          <Text className="text-[9px] text-blue-400 font-bold mt-1">{dashboardData.statsJogadores.mensalistas} Mensalistas</Text>
        </View>
        <View className="flex-1 bg-slate-800 p-4 rounded-2xl border-l-4 border-emerald-500 ml-2 shadow-md">
          <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nível Médio</Text>
          <Text className="text-2xl font-black text-white mt-1">⭐ {dashboardData.statsJogadores.mediaNivel}</Text>
          <Text className="text-[9px] text-emerald-400 font-bold mt-1">Escala 1 a 5</Text>
        </View>
      </View>

      {/* Caixa Financeira (Progresso) */}
      <View className="bg-slate-800 p-5 rounded-2xl mb-4 shadow-md">
        <Text className="font-bold text-yellow-400 mb-4 text-base tracking-wide">
           💰 Arrecadação Acumulada
        </Text>
        
        {/* Barra 1 - Quadra */}
        <View className="mb-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-slate-400">Quadra (Mensalistas)</Text>
            <Text className="text-xs text-white font-bold">R$ {dashboardData.financeiro.totalQuadra.toFixed(2).replace('.',',')}</Text>
          </View>
          <View className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
             <View className="bg-blue-500 h-full" style={{ width: `${(dashboardData.financeiro.totalQuadra/dashboardData.financeiro.totalGeral)*100}%` }} />
          </View>
        </View>
        
        {/* Barra 2 - Avulsos */}
        <View className="mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-slate-400">Equipamentos (Avulsos)</Text>
             <Text className="text-xs text-white font-bold">R$ {dashboardData.financeiro.totalEquipamentos.toFixed(2).replace('.',',')}</Text>
          </View>
          <View className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
             <View className="bg-emerald-500 h-full" style={{ width: `${(dashboardData.financeiro.totalEquipamentos/dashboardData.financeiro.totalGeral)*100}%` }} />
          </View>
        </View>
        
        {/* Rodapé Total */}
        <View className="pt-3 border-t border-slate-700 flex-row justify-between items-center">
             <Text className="text-sm font-bold text-slate-300 uppercase tracking-widest">Total Geral</Text>
             <Text className="text-xl font-black text-yellow-400">R$ {dashboardData.financeiro.totalGeral.toFixed(2).replace('.',',')}</Text>
        </View>
      </View>

      {/* Pendências do Mês (Devedores vs Tudo Certo) */}
      {dashboardData.financeiro.saldoEmAberto > 0 ? (
        <View className="bg-slate-800 p-5 rounded-2xl border-l-4 border-red-500 mb-4 shadow-md">
          <View className="flex-row justify-between items-center mb-4">
             <Text className="font-bold text-red-400 text-base">⚠️ Pendências do Mês</Text>
             <Text className="text-lg font-black text-red-500">R$ {dashboardData.financeiro.saldoEmAberto.toFixed(2).replace('.',',')}</Text>
          </View>
          {dashboardData.financeiro.devedores.map((d, i) => (
            <View key={i} className="flex-row justify-between items-center bg-slate-700 p-2.5 rounded-lg mb-1.5 border border-red-500/20">
               <View className="flex-row items-center">
                 <Text className="text-[10px] text-red-400 font-bold mr-3">{d.dia}</Text>
                 <Text className="text-sm font-bold text-slate-200">{d.nome}</Text>
               </View>
               <Text className="text-xs font-bold text-slate-400">R$ {d.valor.toFixed(2).replace('.',',')}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View className="bg-slate-800 p-5 rounded-2xl border-l-4 border-emerald-500 mb-4 flex-row items-center shadow-md">
          <FontAwesome5 name="check-circle" size={24} color="#10b981" />
          <View className="ml-3">
             <Text className="text-sm font-bold text-white">Tudo em dia!</Text>
             <Text className="text-[10px] text-slate-400">Nenhuma mensalidade pendente neste mês.</Text>
          </View>
        </View>
      )}

      {/* Ranking Top 5 */}
      <View className="bg-slate-800 p-5 rounded-2xl shadow-md mb-4">
         <Text className="font-bold text-amber-400 mb-4 text-base tracking-wide">👑 Top 5 Assíduos</Text>
         {dashboardData.ranking.map((r, i) => (
           <View key={i} className="flex-row justify-between items-center p-3 bg-[#0b0f1a] mb-2 rounded-lg border border-slate-700">
             <View className="flex-row items-center">
               <Text className="text-xs font-black text-slate-500 w-6">#{i+1}</Text>
               <Text className="text-sm font-bold text-white ml-1">{r.nome}</Text>
             </View>
             <Text className="text-xs font-bold text-emerald-400">{r.total} jogos</Text>
           </View>
         ))}
      </View>

    </ScrollView>
  );
}
