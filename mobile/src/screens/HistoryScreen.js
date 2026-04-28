import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Animated } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeLogs } from '../services/historyService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId } = useSession();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  useEffect(() => {
    if (!activeGroupId) return;
    
    const unsub = subscribeLogs(activeGroupId, (dados) => {
      setLogs(dados);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();

    return () => unsub();
  }, [activeGroupId]);

  const filteredLogs = logs.filter(log => {
    const f = filtro.toLowerCase();
    return (log.descricao || '').toLowerCase().includes(f) || 
           (log.categoria || '').toLowerCase().includes(f) ||
           (log.tipo || '').toLowerCase().includes(f);
  });

  const getIcon = (categoria) => {
    switch (categoria) {
      case 'FINANCEIRO': return { icon: 'hand-holding-usd', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
      case 'CADASTRO': return { icon: 'user-cog', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)' };
      case 'PRESENÇA': return { icon: 'calendar-check', color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.1)' };
      default: return { icon: 'info-circle', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)' };
    }
  };

  return (
    <View className="flex-1 bg-[#0b0f1a]">
      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingTop: Math.max(insets.top, 20), paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          <View className="bg-slate-800/40 p-6 rounded-[32px] border border-white/5 shadow-2xl mb-6">
            <View className="flex-row items-center mb-6">
              <View className="bg-rose-500/20 p-3 rounded-2xl">
                <FontAwesome5 name="history" size={18} color="#fb7185" />
              </View>
              <Text className="text-xl font-black text-white ml-4">Histórico</Text>
            </View>

            {/* Filtro */}
            <View className="relative mb-6">
              <TextInput 
                value={filtro}
                onChangeText={setFiltro}
                placeholder="Filtrar por dia, mês ou tipo..."
                placeholderTextColor="#475569"
                className="bg-slate-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-xs"
              />
              <View className="absolute left-4 top-[18px]">
                <FontAwesome5 name="search" size={12} color="#475569" />
              </View>
              {filtro !== '' && (
                <TouchableOpacity 
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFiltro(''); }}
                  className="absolute right-4 top-4"
                >
                  <FontAwesome5 name="times-circle" size={16} color="#475569" />
                </TouchableOpacity>
              )}
            </View>

            {loading ? (
              <View className="py-20">
                <ActivityIndicator color="#fb7185" />
                <Text className="text-slate-500 text-center mt-4 font-bold text-[10px] uppercase tracking-widest">Carregando...</Text>
              </View>
            ) : filteredLogs.length === 0 ? (
              <View className="py-20 items-center opacity-40">
                <FontAwesome5 name="box-open" size={40} color="#475569" />
                <Text className="text-slate-500 text-center mt-4 font-bold text-xs uppercase">Nenhuma movimentação</Text>
              </View>
            ) : (
              <View className="space-y-4">
                {filteredLogs.map(log => {
                  const style = getIcon(log.categoria);
                  const dataPart = log.tipo.split(' ')[0];
                  const horaPart = log.tipo.split(' ')[1];

                  return (
                    <View key={log.id} className="flex-row items-start bg-slate-900/40 p-4 rounded-3xl border border-white/5">
                      <View 
                        style={{ backgroundColor: style.bg }}
                        className="w-11 h-11 rounded-2xl items-center justify-center border border-white/5 mr-4"
                      >
                        <FontAwesome5 name={style.icon} size={16} color={style.color} />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row justify-between items-start">
                          <View className="flex-1 mr-2">
                            <Text className="text-white font-black text-[10px] uppercase tracking-widest">{log.categoria}</Text>
                            <View className="flex-row items-center mt-0.5">
                              <Text className="text-slate-500 font-bold text-[8px] uppercase">{dataPart}</Text>
                              <View className="w-1 h-1 rounded-full bg-slate-700 mx-1.5" />
                              <Text className="text-slate-500 font-bold text-[8px] uppercase">{horaPart}</Text>
                            </View>
                          </View>

                          {log.valor !== 0 && (
                            <View className={`bg-slate-900/60 px-2 py-1 rounded-lg border border-white/5`}>
                              <Text className={`font-black text-[10px] ${log.valor > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {log.valor > 0 ? '+' : '-'} R$ {Math.abs(log.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-slate-400 text-[11px] mt-2 leading-relaxed font-medium">{log.descricao}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}
