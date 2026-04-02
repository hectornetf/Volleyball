import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores, updateJogador } from '../services/jogadorService';

import AuthWrapper from '../components/AuthWrapper';

export default function FinanceiroScreen() {
  const [mesReferencia, setMesReferencia] = useState('04/2026');
  
  const [elenco, setElenco] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = subscribeJogadores((dados) => {
      setElenco(dados);
      setCarregando(false);
    });
    return () => unsub();
  }, []);

  // Lógica Financeira Real-time
  const CUSTO_ALUGUEL_QUADRA = 680.00; // Aluguel da quadra fixo simulado
  const VALOR_MENSALIDADE = 85.00;
  
  const mensalistas = elenco.filter(j => j.tipo === 'MENSALISTA');
  const avulsos = elenco.filter(j => j.tipo === 'AVULSO');

  const metaArrecadacaoQuadra = mensalistas.length * VALOR_MENSALIDADE;
  const mensalistasPagos = mensalistas.filter(j => j.mensalidadePaga).length;
  const arrecadadoQuadra = mensalistasPagos * VALOR_MENSALIDADE;

  const avulsosPagos = avulsos.filter(j => j.diariaPaga).length;
  const caixaEquipamentos = avulsosPagos * 10.00; // R$10 por avulso
  
  const totalGeral = arrecadadoQuadra + caixaEquipamentos;
  const pendencias = metaArrecadacaoQuadra - arrecadadoQuadra;

  const alternarMensalidade = async (jogador) => {
    await updateJogador(jogador.id, { mensalidadePaga: !jogador.mensalidadePaga });
  };

  if (carregando) {
     return (
       <View className="flex-1 bg-[#0b0f1a] justify-center items-center">
         <ActivityIndicator size="large" color="#fbbf24" />
       </View>
     );
  }

  return (
    <AuthWrapper title="Controle Financeiro">
      <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
        {/* Seletor de Mês */}
        <View className="flex-row items-center justify-between bg-slate-800 p-3 rounded-2xl border border-slate-700/50 mb-5 mt-4 shadow-md">
          <TouchableOpacity className="w-10 h-10 rounded-xl bg-slate-700 items-center justify-center">
            <FontAwesome5 name="chevron-left" size={14} color="#94a3b8" />
          </TouchableOpacity>
          <View className="items-center">
            <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Mês de Referência</Text>
            <Text className="text-xl font-black text-white">{mesReferencia}</Text>
          </View>
          <TouchableOpacity className="w-10 h-10 rounded-xl bg-slate-700 items-center justify-center">
            <FontAwesome5 name="chevron-right" size={14} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Resumo Financeiro Superior */}
        <View className="flex-row justify-between mb-4">
          <View className={`flex-1 bg-slate-800 p-4 rounded-2xl border-b-2 mr-2 shadow-md ${pendencias <= 0 ? 'border-emerald-500' : 'border-amber-500'}`}>
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-[9px] text-slate-400 font-bold uppercase w-16">Arrecadação Quadra</Text>
              <View className={`${pendencias <= 0 ? 'bg-emerald-500/20 border-emerald-500/50' : 'bg-amber-500/20 border-amber-500/50'} px-1.5 py-0.5 rounded border`}>
                <Text className={`text-[8px] font-black uppercase ${pendencias <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{pendencias <= 0 ? "Fechado" : "Em Aberto"}</Text>
              </View>
            </View>
            <Text className="text-lg font-black text-emerald-400">R$ {arrecadadoQuadra.toFixed(2).replace('.',',')}</Text>
          </View>
          <View className="flex-1 bg-slate-800 p-4 rounded-2xl border-b-2 border-slate-500 ml-2 shadow-md justify-center">
            <Text className="text-[9px] text-slate-400 font-bold uppercase mb-1">Custo Estipulado</Text>
            <Text className="text-xl font-black text-white">R$ {metaArrecadacaoQuadra.toFixed(2).replace('.',',')}</Text>
          </View>
        </View>

        {/* Fundo Avulsos */}
        <View className="bg-slate-800 p-5 rounded-2xl border-t-2 border-amber-500 shadow-md mb-5">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <FontAwesome5 name="volleyball-ball" size={16} color="#fbbf24" />
              <Text className="font-bold text-amber-500 ml-2">Caixa de Equipamentos</Text>
            </View>
            <View className="bg-amber-500/20 px-2 py-1 rounded">
              <Text className="text-[10px] text-amber-300 font-bold uppercase">Via Avulsos</Text>
            </View>
          </View>
          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-[10px] text-slate-400 font-bold uppercase">Total para Compras</Text>
              <Text className="text-2xl font-black text-white">R$ {caixaEquipamentos.toFixed(2).replace('.',',')}</Text>
            </View>
            <Text className="text-[10px] text-slate-500 italic max-w-[120px] text-right">{avulsosPagos} diárias pagas no mês extra.</Text>
          </View>
        </View>

        {/* Lista de Controle - Todos os Mensalistas do App */}
        <View className="bg-slate-800 p-5 rounded-2xl border-l-4 border-indigo-500 shadow-md mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="font-bold uppercase tracking-wider text-sm text-indigo-400">Rateio Base</Text>
            <Text className="font-black text-white text-xl">R$ {VALOR_MENSALIDADE.toFixed(2).replace('.',',')}<Text className="text-sm font-normal">/cada</Text></Text>
          </View>
          <Text className="text-xs text-slate-400 mb-4">Meta do sistema com base em {mensalistas.length} matriculados listados abaixo.</Text>

          {mensalistas.map((j) => (
            <View key={j.id} className="flex-row items-center justify-between p-2.5 bg-[#0b0f1a] rounded-lg border border-slate-700/50 mb-2">
              <View>
                <Text className={j.mensalidadePaga ? 'text-emerald-400 font-bold text-xs line-through opacity-80' : 'text-slate-100 font-bold text-xs'}>{j.nome}</Text>
                {!j.mensalidadePaga && <Text className="text-[9px] text-red-500 mt-0.5 uppercase tracking-widest font-black">Devedor</Text>}
              </View>
              
              <View className="flex-row space-x-2">
                 {!j.mensalidadePaga && (
                    <TouchableOpacity onPress={() => {
                       Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`Fala ${j.nome}, tudo certo?\nPassando pra lembrar o acerto da mensalidade R$85 deste mês da pelada de Vôlei! Tmj!`)}`);
                    }} className="w-8 h-8 bg-[#25D366]/20 items-center justify-center rounded-md mr-2 border border-[#25D366]/40">
                      <FontAwesome5 name="whatsapp" size={14} color="#25D366" />
                    </TouchableOpacity>
                 )}
                 <TouchableOpacity onPress={() => alternarMensalidade(j)} className={`w-8 h-8 items-center justify-center rounded-md ${j.mensalidadePaga ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <FontAwesome5 name={j.mensalidadePaga ? "check" : "minus"} size={12} color={j.mensalidadePaga ? "white" : "#94a3b8"} />
                 </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </AuthWrapper>
  );
}
