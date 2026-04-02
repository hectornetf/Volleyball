import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { subscribeJogadores } from '../services/jogadorService';

export default function TimesScreen() {
  const [jogadoresPorTime, setJogadoresPorTime] = useState(6);
  const [times, setTimes] = useState([]);
  
  // Guardamos apenas os jogadores confirmados na memória do sorteador
  const [confirmados, setConfirmados] = useState([]);

  useEffect(() => {
    const unsub = subscribeJogadores((dados) => {
      // Filtrar apenas quem marcou 'Vou' na Presença
      setConfirmados(dados.filter(j => j.presencaAtual === 'Confirmado'));
    });
    return () => unsub();
  }, []);

  const gerarTimes = () => {
    if (confirmados.length === 0) {
      return Alert.alert('Ops!', 'Nenhum jogador confirmou presença ainda na segunda tela.');
    }

    if (confirmados.length < jogadoresPorTime * 2) {
      // Retorna alerta, mas deixa gerar mesmo assim se quiserem forçar
      Alert.alert('Aviso', 'A quantidade de jogadores confirmados não é suficiente para montar 2 times completos. O sistema dividirá os presentes.');
    }

    // Ordenar os jogadores pelo seu Nível de Estrela (Elites primeiro)
    const jogadoresOrdenados = [...confirmados].sort((a, b) => b.nivel - a.nivel || 0.5 - Math.random());

    const qtdTimes = Math.max(2, Math.ceil(jogadoresOrdenados.length / jogadoresPorTime));
    const novosTimes = Array.from({ length: qtdTimes }, () => []);

    // ALGORITMO SNAKE DRAFT: O time q ganha o pior primeiro de uma rodada, ganha o melhor primeiro na próxima rodada, cruzando forças.
    let direcaoIda = true;
    let indiceTime = 0;

    for (let i = 0; i < jogadoresOrdenados.length; i++) {
        novosTimes[indiceTime].push(jogadoresOrdenados[i]);
        
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
          <Text className="text-sm text-slate-300 font-bold">Máximo de jogadores por time:</Text>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => setJogadoresPorTime(j => Math.max(1, j-1))} className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center">
              <Text className="text-white font-bold text-lg">-</Text>
            </TouchableOpacity>
            <Text className="text-xl font-black text-white mx-5">{jogadoresPorTime}</Text>
            <TouchableOpacity onPress={() => setJogadoresPorTime(j => j+1)} className="w-9 h-9 rounded-full bg-slate-700 items-center justify-center">
              <Text className="text-white font-bold text-lg">+</Text>
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
                <View key={i} className="flex-row justify-between items-center py-2 border-b border-slate-700/50 last:border-0 pl-1">
                  <Text className="font-semibold text-slate-100">{j.nome}</Text>
                  <View className="flex-row">
                    {[...Array(j.nivel)].map((_, star) => (
                      <FontAwesome5 key={star} name="star" solid size={10} color="#fbbf24" style={{ marginLeft: 2 }} />
                    ))}
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
