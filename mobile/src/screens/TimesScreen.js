import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, Animated, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TimesScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId } = useSession();
  const [jogadoresPorTime, setJogadoresPorTime] = useState(6);
  const [times, setTimes] = useState([]);
  const [confirmados, setConfirmados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados Animados
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(20));

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (dados) => {
      setConfirmados(dados.filter(j => j.presencaAtual === 'Confirmado'));
      setCarregando(false);
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();

    return () => unsub();
  }, [activeGroupId]);

  const gerarTimes = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (confirmados.length === 0) {
      return Alert.alert('Ops!', 'Ninguém confirmou presença para o sorteio.');
    }

    // Lógica Snake Draft para Balanceamento
    const elite = [...confirmados].filter(j => (j.nivel || 3) >= 3).sort((a, b) => b.nivel - a.nivel || 0.5 - Math.random());
    const iniciantes = [...confirmados].filter(j => (j.nivel || 3) < 3).sort((a, b) => b.nivel - a.nivel || 0.5 - Math.random());

    const qtdTimes = Math.max(2, Math.ceil(confirmados.length / jogadoresPorTime));
    const novosTimes = Array.from({ length: qtdTimes }, () => []);
    const pesosTimes = Array.from({ length: qtdTimes }, () => 0);

    let direcaoIda = true;
    let indiceTime = 0;

    // Distribuir Elite
    for (let i = 0; i < elite.length; i++) {
        novosTimes[indiceTime].push(elite[i]);
        pesosTimes[indiceTime] += elite[i].nivel || 3;
        if (direcaoIda) {
            indiceTime++;
            if (indiceTime === qtdTimes) { indiceTime--; direcaoIda = false; }
        } else {
            indiceTime--;
            if (indiceTime < 0) { indiceTime = 0; direcaoIda = true; }
        }
    }

    // Distribuir Iniciantes para balancear o peso total
    for (let i = 0; i < iniciantes.length; i++) {
        let melhorTimeIdx = 0;
        for (let t = 1; t < novosTimes.length; t++) {
           if (novosTimes[t].length < novosTimes[melhorTimeIdx].length) { melhorTimeIdx = t; }
           else if (novosTimes[t].length === novosTimes[melhorTimeIdx].length) {
              if (pesosTimes[t] < pesosTimes[melhorTimeIdx]) { melhorTimeIdx = t; }
           }
        }
        novosTimes[melhorTimeIdx].push(iniciantes[i]);
        pesosTimes[melhorTimeIdx] += iniciantes[i].nivel || 3;
    }
    setTimes(novosTimes);
  };

  const enviarWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const dataH = new Date().toLocaleDateString('pt-BR');
    let mensagem = `🏆 *VOLEIZIN: TIMES SORTEADOS* 🏆\n📅 _${dataH}_\n\n`;
    times.forEach((time, index) => {
      const somaLvl = time.reduce((acc, j) => acc + (j.nivel || 3), 0);
      mensagem += `*Time ${index + 1}* [Poder: ${somaLvl}]\n`;
      time.forEach(j => { mensagem += `- ${j.nome} (Lvl ${j.nivel || 3})\n`; });
      mensagem += `\n`;
    });
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(mensagem)}`).catch(() => Alert.alert("Erro", "WhatsApp não instalado."));
  };

  const somaNivel = (time) => time.reduce((acc, j) => acc + (j.nivel || 3), 0);

  return (
    <ScrollView 
        className="flex-1 bg-[#0b0f1a]" 
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        
        {/* Header Hero */}
        <View 
          style={{ marginTop: Math.max(insets.top, 20) }}
          className="flex-row items-center justify-between mb-8"
        >
          <View>
            <Text className="text-slate-500 text-[10px] font-black uppercase tracking-[4px]">Sorteio</Text>
            <Text className="text-white text-3xl font-black mt-1">Montar <Text className="text-cyan-400">Times</Text></Text>
          </View>
          <View className="bg-cyan-500/20 p-4 rounded-[24px]">
            <FontAwesome5 name="random" size={20} color="#22d3ee" />
          </View>
        </View>

        {/* Card Configuração */}
        <View className="bg-slate-800/40 p-6 rounded-[32px] border border-white/5 mb-8 shadow-2xl">
          <View className="flex-row justify-between items-center mb-6">
             <View>
                <Text className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Capacidade</Text>
                <Text className="text-white text-lg font-black">Jogadores por Time</Text>
             </View>
             <View className="bg-slate-900/60 flex-row items-center p-1.5 rounded-2xl border border-white/5">
                <TouchableOpacity 
                   onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setJogadoresPorTime(j => Math.max(1, j-1)); }}
                   className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-white/5 active:scale-90"
                >
                  <FontAwesome5 name="minus" size={10} color="white" />
                </TouchableOpacity>
                <View className="w-12 items-center">
                   <Text className="text-xl font-black text-white">{jogadoresPorTime}</Text>
                </View>
                <TouchableOpacity 
                   onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setJogadoresPorTime(j => j+1); }}
                   className="w-10 h-10 rounded-xl bg-slate-800 items-center justify-center border border-white/5 active:scale-90"
                >
                  <FontAwesome5 name="plus" size={10} color="white" />
                </TouchableOpacity>
             </View>
          </View>

          <View className="bg-cyan-500/10 p-4 rounded-2xl border border-cyan-500/20 mb-6 flex-row items-center">
             <FontAwesome5 name="info-circle" size={14} color="#22d3ee" />
             <Text className="text-cyan-100 text-[10px] font-bold ml-3 flex-1">
                {confirmados.length} atletas confirmados. Serão gerados {Math.max(2, Math.ceil(confirmados.length / jogadoresPorTime))} times.
             </Text>
          </View>

          <TouchableOpacity 
            onPress={gerarTimes} 
            className="w-full bg-cyan-600 py-4.5 rounded-2xl items-center shadow-lg shadow-cyan-500/30 active:scale-[0.98]"
          >
            <Text className="text-white font-black text-sm uppercase tracking-widest">Executar Sorteio</Text>
          </TouchableOpacity>
        </View>

        {/* Listagem de Times */}
        {carregando ? (
           <ActivityIndicator size="large" color="#22d3ee" />
        ) : (
          <View className="space-y-6">
            {times.length > 0 && (
              <TouchableOpacity 
                onPress={enviarWhatsApp} 
                className="w-full bg-[#25D366] p-4.5 rounded-[24px] shadow-lg shadow-emerald-500/20 flex-row justify-center items-center mb-6 active:scale-[0.98]"
              >
                <FontAwesome5 name="whatsapp" size={18} color="white" />
                <Text className="text-white font-black text-xs uppercase tracking-widest ml-3">Enviar Escalação</Text>
              </TouchableOpacity>
            )}

            {times.map((time, index) => (
              <View key={index} className="bg-slate-800/60 rounded-[32px] border border-white/5 overflow-hidden shadow-sm mb-4">
                <View className="p-5 bg-cyan-500/10 flex-row justify-between items-center border-b border-white/10">
                   <Text className="text-cyan-400 font-black uppercase text-xs tracking-widest">Time {index + 1}</Text>
                   <View className="bg-cyan-500/20 px-3 py-1.5 rounded-xl border border-cyan-500/20">
                      <Text className="text-cyan-300 font-black text-[10px]">PODER: {somaNivel(time)}</Text>
                   </View>
                </View>

                <View className="p-4">
                  {time.map((j, i) => (
                    <View key={j.id} className="flex-row items-center justify-between p-3.5 mb-2 bg-slate-900/40 rounded-2xl border border-white/5">
                      <Text numberOfLines={1} className="flex-1 text-slate-100 font-black text-xs mr-4">{j.nome}</Text>
                      
                      {/* Nível Responsivo */}
                      <View className="flex-row items-center bg-slate-800/80 px-2.5 py-1 rounded-lg border border-white/5">
                        {[...Array(5)].map((_, s) => (
                          <FontAwesome5 
                            key={s} 
                            name="star" 
                            solid={s < (j.nivel || 3)} 
                            size={8} 
                            color={s < (j.nivel || 3) ? "#fbbf24" : "#1e293b"} 
                            style={{ marginHorizontal: 1 }} 
                          />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            {times.length === 0 && !carregando && (
              <View className="py-20 items-center opacity-40">
                <FontAwesome5 name="layer-group" size={48} color="#1e293b" />
                <Text className="text-slate-600 font-black text-xs mt-4 uppercase tracking-[4px]">Aguardando Sorteio</Text>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
