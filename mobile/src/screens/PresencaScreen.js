import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores, updateJogador } from '../services/jogadorService';

export default function PresencaScreen() {
  const [diaSelecionado, setDiaSelecionado] = useState('Segunda');
  const diasDaSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const [jogadores, setJogadores] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Escutando Firebase em Real-Time
  useEffect(() => {
    const unsubscribe = subscribeJogadores((dados) => {
      setJogadores(dados);
      setCarregando(false);
    }, (err) => {
       console.error(err);
       setCarregando(false);
    });
    return () => unsubscribe();
  }, []);

  const marcar = async (jogador, status) => {
    try {
      if (jogador.tipo === 'AVULSO' && !jogador.diariaPaga && status === 'Confirmado') {
        Alert.alert('Atenção', 'Avulsos só podem confirmar após o pagamento da diária de R$10!');
        return;
      }
      // Atualiza direto no Firebase (Real-time)
      await updateJogador(jogador.id, { presencaAtual: status });
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  };

  const pagarAvulso = (jogador) => {
    Alert.alert('Confirmar Pagamento', 'Marcar os R$10 do avulso como PAGO?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sim', onPress: async () => {
         try {
           await updateJogador(jogador.id, { diariaPaga: true });
         } catch (err) {
           Alert.alert('Erro', err.message);
         }
      }}
    ]);
  };

  const totalConfirmados = jogadores.filter(j => j.presencaAtual === 'Confirmado').length;


  return (
    <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {/* Container Principal */}
      <View className="bg-slate-800 p-5 rounded-2xl shadow-md mb-4 mt-6">
        <View className="flex-row items-center mb-4">
          <FontAwesome5 name="calendar-check" size={20} color="#34d399" />
          <Text className="text-xl font-bold text-white ml-2">Próximo Jogo</Text>
        </View>

        {/* Carrossel de Dias */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 flex-row">
          {diasDaSemana.map(dia => {
            const isActive = diaSelecionado === dia;
            return (
              <TouchableOpacity
                key={dia}
                onPress={() => setDiaSelecionado(dia)}
                className={`mr-3 min-w-[80px] py-3 rounded-xl items-center border ${isActive ? 'bg-emerald-500 border-emerald-400' : 'bg-[#0b0f1a] border-slate-700'}`}
              >
                <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>
                  {dia.substring(0,3).toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity className="w-full bg-emerald-500 py-3.5 rounded-xl items-center shadow shadow-emerald-500/50">
          <Text className="text-white font-bold text-base">Atualizar Lista</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Confirmados */}
      <View className="bg-slate-800 p-5 rounded-2xl shadow-md">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="font-bold text-white text-lg">Confirmados: <Text className="text-emerald-400 text-2xl">{totalConfirmados}</Text></Text>
          <TouchableOpacity className="bg-[#0b0f1a] px-3 py-2 rounded-lg border border-slate-700 flex-row items-center">
            <FontAwesome5 name="whatsapp" size={14} color="#34d399" />
            <Text className="text-emerald-400 font-bold text-xs ml-1.5">Cobrar</Text>
          </TouchableOpacity>
        </View>

        {carregando ? (
           <ActivityIndicator size="large" color="#34d399" style={{ marginVertical: 30 }} />
        ) : jogadores.length === 0 ? (
           <Text className="text-slate-500 italic text-center py-5">Nenhum jogador salvo no banco ainda.</Text>
        ) : (
          <View className="space-y-3 mt-2">
            {jogadores.map(j => (
              <View key={j.id} className="bg-[#0b0f1a] p-3 rounded-xl border border-slate-700 flex-row justify-between items-center mb-2">
                <View className="flex-1">
                  <View className="flex-row items-center">
                    <Text className={`tracking-tight font-bold mr-2 ${j.presencaAtual === 'Confirmado' ? 'text-emerald-400' : j.presencaAtual === 'Falta' ? 'text-red-400 line-through opacity-50' : 'text-slate-200'}`}>
                      {j.nome}
                    </Text>
                    {j.presencaAtual === 'Confirmado' && (
                      <View className={`px-1.5 py-0.5 rounded ${j.tipo === 'AVULSO' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                        <Text className={`text-[9px] font-bold uppercase ${j.tipo === 'AVULSO' ? 'text-amber-400' : 'text-emerald-400'}`}>{j.tipo}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">{j.tipo} | ⭐{j.nivel}</Text>
                </View>

                <View className="flex-row items-center space-x-2">
                  {/* Botão Pagar Avulso */}
                  {j.tipo === 'AVULSO' && !j.diariaPaga && (
                    <TouchableOpacity onPress={() => pagarAvulso(j)} className="bg-amber-500 px-2 py-1.5 rounded-lg border border-amber-400 shadow shadow-amber-500/30 mr-1.5">
                      <Text className="text-white font-black text-[9px]">💰 R$ 10</Text>
                    </TouchableOpacity>
                  )}
                  {j.tipo === 'AVULSO' && j.diariaPaga && (
                    <View className="bg-amber-500/10 px-2 py-1.5 rounded-md border border-amber-400/20 mr-1.5">
                      <Text className="text-amber-400 font-black text-[9px]">PAGO ✅</Text>
                    </View>
                  )}

                  {/* Botões Vou/Falto */}
                  <TouchableOpacity onPress={() => marcar(j, 'Confirmado')} className={`mr-1.5 px-3 py-2 rounded-lg ${j.presencaAtual === 'Confirmado' ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <Text className={`font-bold text-xs ${j.presencaAtual === 'Confirmado' ? 'text-white' : 'text-slate-300'}`}>Vou</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => marcar(j, 'Falta')} className={`px-3 py-2 rounded-lg ${j.presencaAtual === 'Falta' ? 'bg-red-500' : 'bg-slate-700'}`}>
                    <Text className={`font-bold text-xs ${j.presencaAtual === 'Falta' ? 'text-white' : 'text-slate-300'}`}>Falto</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
