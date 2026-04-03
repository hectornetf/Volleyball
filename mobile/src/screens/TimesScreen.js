import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores } from '../services/jogadorService';
import { useSession } from '../context/SessionContext';

export default function TimesScreen() {
  const { activeGroupId } = useSession();
  const [jogadoresPorTime, setJogadoresPorTime] = useState(6);
  const [times, setTimes] = useState([]);
  const [confirmados, setConfirmados] = useState([]);

  useEffect(() => {
    if (!activeGroupId) return;
    const unsub = subscribeJogadores(activeGroupId, (dados) => {
      setConfirmados(dados.filter(j => j.presencaAtual === 'Confirmado'));
    });
    return () => unsub();
  }, [activeGroupId]);

  const gerarTimes = () => {
    if (confirmados.length === 0) {
      return Alert.alert('Ops!', 'Nenhum jogador confirmou presença ainda na segunda tela.');
    }

    // GS LOGIC: Separa Elite (>=3) de Iniciante (<3)
    const elite = confirmados.filter(j => j.nivel >= 3).sort((a, b) => b.nivel - a.nivel || 0.5 - Math.random());
    const iniciantes = confirmados.filter(j => j.nivel < 3).sort((a, b) => b.nivel - a.nivel || 0.5 - Math.random());

    const qtdTimes = Math.max(2, Math.ceil(confirmados.length / jogadoresPorTime));
    const novosTimes = Array.from({ length: qtdTimes }, () => []);
    const pesosTimes = Array.from({ length: qtdTimes }, () => 0);

    // 1. SNAKE DRAFT para os ELITES
    let direcaoIda = true;
    let indiceTime = 0;

    for (let i = 0; i < elite.length; i++) {
        novosTimes[indiceTime].push(elite[i]);
        pesosTimes[indiceTime] += elite[i].nivel;
        
        if (direcaoIda) {
            indiceTime++;
            if (indiceTime === qtdTimes) {
              indiceTime--;
              direcaoIda = false;
            }
        } else {
            indiceTime--;
            if (indiceTime < 0) {
              indiceTime = 0;
              direcaoIda = true;
            }
        }
    }

    // 2. ROUND ROBIN para os INICIANTES (Garante dispersão por peso atual)
    for (let i = 0; i < iniciantes.length; i++) {
        // Encontra o time com menos jogadores e menor peso
        let melhorTimeIdx = 0;
        for (let t = 1; t < novosTimes.length; t++) {
           if (novosTimes[t].length < novosTimes[melhorTimeIdx].length) {
              melhorTimeIdx = t;
           } else if (novosTimes[t].length === novosTimes[melhorTimeIdx].length) {
              if (pesosTimes[t] < pesosTimes[melhorTimeIdx]) {
                 melhorTimeIdx = t;
              }
           }
        }
        novosTimes[melhorTimeIdx].push(iniciantes[i]);
        pesosTimes[melhorTimeIdx] += iniciantes[i].nivel;
    }
    
    setTimes(novosTimes);
  };

  const enviarWhatsApp = () => {
    let mensagem = `🏆 *TIMES GERADOS - VOLEIZIN DOS CRIA* 🏆\n\n`;
    
    times.forEach((time, index) => {
      const somaLvl = time.reduce((acc, j) => acc + j.nivel, 0);
      mensagem += `*Time ${index + 1}* [Poder: ${somaLvl}]\n`;
      time.forEach(j => {
         mensagem += `- ${j.nome} (⭐ ${j.nivel})\n`;
      });
      mensagem += `\n`;
    });

    const msgEncode = encodeURIComponent(mensagem);
    // Tenta abrir o WhatsApp
    Linking.openURL(`whatsapp://send?text=${msgEncode}`).catch(() => {
      Alert.alert("Erro", "Você precisa ter o WhatsApp instalado no aparelho.");
    });
  };

  const somaNivel = (time) => time.reduce((acc, j) => acc + j.nivel, 0);

  return (
    <ScrollView className="flex-1 bg-[#0b0f1a]" contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {/* Sorteador Global */}
      <View className="bg-slate-800 p-5 rounded-2xl shadow-md mb-4 mt-6">
        <View className="flex-row items-center mb-4">
          <FontAwesome5 name="users" size={20} color="#22d3ee" />
          <Text className="text-xl font-bold text-white ml-2">Sortear Times</Text>
        </View>
        
        <View className="mb-4 flex-row items-center bg-cyan-900/40 p-3 rounded-lg border border-cyan-800">
           <FontAwesome5 name="info-circle" size={12} color="#22d3ee" />
           <Text className="text-xs text-cyan-200 ml-2">Total de confirmados lidos: {confirmados.length}</Text>
        </View>

        {/* Counter */}
        <View className="bg-[#0b0f1a] p-4 rounded-xl flex-row justify-between items-center mb-5 border border-slate-700">
          <View className="flex-1 mr-2">
            <Text className="text-xs text-slate-400 font-black uppercase tracking-tighter">Jogadores por time:</Text>
          </View>
          <View className="flex-row items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
            <TouchableOpacity 
              onPress={() => setJogadoresPorTime(j => Math.max(1, j-1))} 
              className="w-10 h-10 rounded-lg bg-slate-900 items-center justify-center"
            >
              <Text className="text-white font-black text-xl">-</Text>
            </TouchableOpacity>
            
            <View className="w-12 items-center">
              <Text className="text-xl font-black text-emerald-400">{jogadoresPorTime}</Text>
            </View>

            <TouchableOpacity 
              onPress={() => setJogadoresPorTime(j => j+1)} 
              className="w-10 h-10 rounded-lg bg-slate-900 items-center justify-center"
            >
              <Text className="text-white font-black text-xl">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={gerarTimes} className="w-full bg-cyan-500 py-3.5 rounded-xl items-center shadow shadow-cyan-500/50 flex-row justify-center">
          <FontAwesome5 name="random" size={16} color="white" />
          <Text className="text-white font-black text-base ml-2">Gerar Times Balanceados</Text>
        </TouchableOpacity>
      </View>

      {/* Resultados dos Times */}
      {times.length > 0 && (
        <View className="space-y-4">
          <TouchableOpacity onPress={enviarWhatsApp} className="w-full bg-[#25D366] py-3.5 rounded-xl shadow-lg flex-row justify-center items-center mb-4">
            <FontAwesome5 name="whatsapp" size={20} color="white" />
            <Text className="text-white font-black text-base ml-2">Enviar no Grupo do WhatsApp</Text>
          </TouchableOpacity>

          {times.map((time, index) => (
            <View key={index} className="bg-slate-800 p-4 rounded-2xl border-t-4 border-t-cyan-400 mb-4 shadow">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="font-bold text-cyan-400 text-lg">Time {index + 1}</Text>
                <View className="bg-[#0b0f1a] px-2 py-1 rounded border border-slate-700">
                  <Text className="text-xs text-cyan-300 font-bold">Lvl Total: {somaNivel(time)}</Text>
                </View>
              </View>

              {time.map((j, i) => (
                <View key={i} className="flex-row justify-between items-center py-2.5 border-b border-slate-700/30 last:border-0 px-1">
                  <View className="flex-1 pr-2">
                    <Text numberOfLines={1} className="font-bold text-slate-200 text-sm">{j.nome}</Text>
                  </View>
                  <View className="flex-row items-center bg-slate-900/50 px-2 py-1 rounded-lg">
                    {[...Array(j.nivel)].map((_, star) => (
                      <FontAwesome5 key={star} name="star" solid size={8} color="#fbbf24" style={{ marginLeft: 2 }} />
                    ))}
                    <Text className="text-[9px] text-slate-500 font-black ml-2 uppercase">Lvl {j.nivel}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
