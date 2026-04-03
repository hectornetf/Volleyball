import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores, updateJogador, registrarOperacaoFinanceira, incrementarPresencaHistorica } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';

const diasDaSemana = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function PresencaScreen() {
  const { activeGroupId } = useSession();
  const [diaSelecionado, setDiaSelecionado] = useState('Segunda');
  const [jogadores, setJogadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const carregarDados = () => {
    // onSnapshot já é real-time, mas o RefreshControl ajuda a garantir 
    // que o componente re-renderize ou force uma atualização se o cache falhar.
    setRefreshing(false);
  };

  useEffect(() => {
    if (!activeGroupId) return;
    const unsubscribe = subscribeJogadores(activeGroupId, (dados) => {
      setJogadores(dados);
      setCarregando(false);
    }, (err) => {
       console.error(err);
       setCarregando(false);
    });
    return () => unsubscribe();
  }, [activeGroupId]);

  const handleRefresh = () => {
    setRefreshing(true);
    carregarDados();
  };

  const marcar = async (jogador, status) => {
    try {
      if (jogador.tipo === 'AVULSO' && !jogador.diariaPaga && status === 'Confirmado') {
        Alert.alert('Atenção', 'Avulsos só podem confirmar após o pagamento da diária de R$10!');
        return;
      }
      
      const statusAntigo = jogador.presencaAtual;
      
      // Se o status mudou para Confirmado, ganha +1 no Ranking Global
      if (statusAntigo !== 'Confirmado' && status === 'Confirmado') {
        await incrementarPresencaHistorica(jogador.id, 1);
      } 
      // Se retirou a confirmação, perde -1 no Ranking Global
      else if (statusAntigo === 'Confirmado' && status !== 'Confirmado') {
        await incrementarPresencaHistorica(jogador.id, -1);
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
           // GS PARITY: Registra a entrada no fundo de equipamentos
           await registrarOperacaoFinanceira('ENTRADA_AVULSO', 10.00, `Diária Avulso: ${jogador.nome}`, activeGroupId);
         } catch (err) {
           Alert.alert('Erro', err.message);
         }
      }}
    ]);
  };

  const totalConfirmados = jogadores.filter(j => j.presencaAtual === 'Confirmado').length;

  return (
    <ScrollView 
      className="flex-1 bg-[#0b0f1a]" 
      contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#34d399" />}
    >
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
                <View className="flex-1 pr-2">
                  <View className="flex-row items-center flex-wrap">
                    <Text numberOfLines={1} className={`tracking-tight font-bold mr-1.5 ${j.presencaAtual === 'Confirmado' ? 'text-emerald-400' : j.presencaAtual === 'Falta' ? 'text-red-400 line-through opacity-50' : 'text-slate-200'}`}>
                      {j.nome}
                    </Text>
                    {j.presencaAtual === 'Confirmado' && (
                      <View className={`px-1.5 py-0.5 rounded ${j.tipo === 'AVULSO' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                        <Text className={`text-[8px] font-bold uppercase ${j.tipo === 'AVULSO' ? 'text-amber-400' : 'text-emerald-400'}`}>{j.tipo}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-tighter">{j.tipo} • ⭐{j.nivel}</Text>
                </View>

                <View className="flex-row items-center">
                  {/* Botão Pagar Avulso (Apenas se pendente) */}
                  {j.tipo === 'AVULSO' && (
                    <TouchableOpacity 
                      onPress={() => pagarAvulso(j)} 
                      disabled={j.diariaPaga}
                      className={`mr-2 h-9 px-2.5 rounded-lg justify-center items-center border ${j.diariaPaga ? 'bg-transparent border-amber-500/20' : 'bg-amber-500 border-amber-400'}`}
                    >
                      <Text className={`font-black text-[9px] ${j.diariaPaga ? 'text-amber-500' : 'text-white'}`}>
                        {j.diariaPaga ? 'PAGO' : 'R$ 10'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Botões Vou/Falto compactos */}
                  <View className="bg-slate-800 p-0.5 rounded-lg flex-row border border-slate-700">
                    <TouchableOpacity 
                      onPress={() => marcar(j, 'Confirmado')} 
                      className={`px-3 py-1.5 rounded-md ${j.presencaAtual === 'Confirmado' ? 'bg-emerald-500 shadow-sm' : 'bg-transparent'}`}
                    >
                      <Text className={`font-bold text-[10px] ${j.presencaAtual === 'Confirmado' ? 'text-white' : 'text-slate-500'}`}>VOU</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => marcar(j, 'Falta')} 
                      className={`px-3 py-1.5 rounded-md ${j.presencaAtual === 'Falta' ? 'bg-red-500 shadow-sm' : 'bg-transparent'}`}
                    >
                      <Text className={`font-bold text-[10px] ${j.presencaAtual === 'Falta' ? 'text-white' : 'text-slate-500'}`}>FALTO</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
