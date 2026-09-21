import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSession } from '../context/SessionContext';
import { subscribeJogadores, updateJogador } from '../services/jogadorService';
import { carregarHistoricoTimes } from '../services/teamDrawService';
import { montarPainelEstatisticas, idsJogadoresDoTime, confrontosDoSorteio } from '../utils/estatisticasUtils';
import Avatar from '../components/Avatar';
import { gerarAvatarAleatorio } from '../utils/avatarUtils';

const formatarData = (iso) => {
  const [a, m, d] = (iso || '').split('-');
  return d && m && a ? `${d}/${m}/${a}` : iso || '—';
};

export default function MeuPerfilScreen() {
  const insets = useSafeAreaInsets();
  const { activeGroupId } = useSession();
  const [jogadores, setJogadores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [meuId, setMeuId] = useState(null);
  const [busca, setBusca] = useState('');
  const [avatarSel, setAvatarSel] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [historicoTimes, setHistoricoTimes] = useState([]);

  const storageKey = `voleizin_jogador_${activeGroupId}`;

  useEffect(() => {
    if (!activeGroupId) return;
    let ativo = true;

    AsyncStorage.getItem(storageKey).then((salvo) => {
      if (ativo && salvo) setMeuId(salvo);
    });

    const unsub = subscribeJogadores(activeGroupId, (list) => {
      setJogadores(list);
      setCarregando(false);
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, [activeGroupId, storageKey]);

  const jogadorAtual = jogadores.find((j) => j.id === meuId) || null;

  useEffect(() => {
    if (!activeGroupId || !meuId) return;
    let ativo = true;
    carregarHistoricoTimes(activeGroupId).then((historico) => {
      if (ativo) setHistoricoTimes(historico);
    });
    return () => { ativo = false; };
  }, [activeGroupId, meuId]);

  const painelItem =
    montarPainelEstatisticas(jogadores, historicoTimes).find((p) => p.jogador.id === jogadorAtual?.id) || {
      jogos: 0,
      vitorias: 0,
      aproveitamento: 0,
      presencas: Number(jogadorAtual?.historicoPresencas) || 0,
      forca: Number(jogadorAtual?.nivel) || 3,
      historicoSuficiente: false,
      serie: [],
      evolucao: 0,
    };

  const presencasRecentes = Object.entries(jogadorAtual?.presencas || {})
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 8);

  const partidasRecentes = historicoTimes
    .filter((sorteio) => (sorteio.times || []).some((t) => idsJogadoresDoTime(t).includes(jogadorAtual?.id)))
    .map((sorteio) => {
      const times = sorteio.times || [];
      const idx = times.findIndex((t) => idsJogadoresDoTime(t).includes(jogadorAtual.id));
      const confrontos = confrontosDoSorteio(sorteio) || [];
      const vitorias = confrontos
        .filter((c) => c.a === idx).reduce((s, c) => s + (Number(c.vitoriasA) || 0), 0)
        + confrontos.filter((c) => c.b === idx).reduce((s, c) => s + (Number(c.vitoriasB) || 0), 0);
      const derrotas = confrontos
        .filter((c) => c.a === idx).reduce((s, c) => s + (Number(c.vitoriasB) || 0), 0)
        + confrontos.filter((c) => c.b === idx).reduce((s, c) => s + (Number(c.vitoriasA) || 0), 0);
      return { data: sorteio.data, dia: sorteio.dia, time: `Time ${idx + 1}`, vitorias, derrotas };
    })
    .slice(0, 8);

  const tendencia = painelItem.evolucao;
  const corFlecha = tendencia > 0.05 ? '#34d399' : tendencia < -0.05 ? '#f87171' : '#94a3b8';

  useEffect(() => {
    if (!jogadorAtual) return;
    if (jogadorAtual.avatar) setAvatarSel(jogadorAtual.avatar);
    else setAvatarSel((prev) => prev || gerarAvatarAleatorio());
  }, [meuId, jogadores]);

  const escolherJogador = useCallback(async (id) => {
    await AsyncStorage.setItem(storageKey, id);
    setMeuId(id);
    setAvatarSel('');
    setBusca('');
  }, [storageKey]);

  const trocarJogador = useCallback(async () => {
    await AsyncStorage.removeItem(storageKey);
    setMeuId(null);
    setAvatarSel('');
    setUrlInput('');
  }, [storageKey]);

  const salvar = useCallback(async (url) => {
    if (!jogadorAtual) return;
    setSalvando(true);
    try {
      await updateJogador(jogadorAtual.id, { avatar: (url ?? avatarSel).trim() }, activeGroupId);
      if (url !== undefined) setAvatarSel(url);
      setUrlInput('');
      Alert.alert('Pronto', (url ?? avatarSel).trim() ? 'Avatar salvo com sucesso!' : 'Avatar removido.');
    } catch (e) {
      Alert.alert('Erro ao salvar avatar', e.message);
    } finally {
      setSalvando(false);
    }
  }, [jogadorAtual, avatarSel, activeGroupId]);

  if (carregando) {
    return (
      <View className="flex-1 bg-[#0b0f1a] items-center justify-center">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  // ── Etapa 1: escolher quem é você ──────────────────────────────────────────
  if (!jogadorAtual) {
    const ativos = jogadores.filter((j) => j.status === 'Ativo');
    const filtrados = ativos.filter((j) => j.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
      <View className="flex-1 bg-[#0b0f1a]" style={{ paddingTop: insets.top + 12 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} className="px-5">
          <View className="bg-slate-800/45 p-6 rounded-3xl border border-white/5 mb-5 mt-2">
            <View className="flex-row items-center gap-2 mb-2">
              <FontAwesome5 name="user-circle" size={14} color="#22d3ee" />
              <Text className="text-cyan-400 font-bold text-xs uppercase tracking-wider">Meu Perfil</Text>
            </View>
            <Text className="text-white font-black text-2xl">Quem é você?</Text>
            <Text className="text-slate-400 text-xs mt-1">
              Escolha seu nome para personalizar o avatar. Fica salvo só neste aparelho.
            </Text>
          </View>

          <View className="flex-row items-center bg-slate-800/60 rounded-2xl px-4 mb-4 border border-white/5">
            <FontAwesome5 name="search" size={13} color="#64748b" />
            <TextInput
              value={busca}
              onChangeText={setBusca}
              placeholder="Buscar seu nome..."
              placeholderTextColor="#64748b"
              className="flex-1 text-white text-sm py-3 pl-3"
            />
          </View>

          {filtrados.map((j) => (
            <TouchableOpacity
              key={j.id}
              onPress={() => escolherJogador(j.id)}
              className="flex-row items-center gap-3 bg-slate-800/45 rounded-2xl p-3 mb-2 border border-white/5"
            >
              <Avatar jogador={j} size={44} />
              <View className="flex-1">
                <Text numberOfLines={1} className="text-white font-bold text-sm">{j.nome}</Text>
                <Text className="text-slate-500 text-[11px] font-semibold">
                  {j.tipo || 'AVULSO'} • Nível {j.nivel || 3}
                </Text>
              </View>
              <FontAwesome5 name="chevron-right" size={12} color="#475569" />
            </TouchableOpacity>
          ))}
          {filtrados.length === 0 && (
            <Text className="text-center text-slate-500 text-xs py-8 italic">
              Nenhum jogador ativo encontrado.
            </Text>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Etapa 2: personalizar avatar ───────────────────────────────────────────
  return (
    <View className="flex-1 bg-[#0b0f1a]" style={{ paddingTop: insets.top + 12 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} className="px-5">
        <View className="bg-slate-800/45 p-5 rounded-3xl border border-white/5 mb-5 mt-2 items-center">
          <Avatar jogador={{ ...jogadorAtual, avatar: avatarSel }} size={96} />
          <Text className="text-cyan-400 font-bold text-[11px] uppercase tracking-wider mt-3">Meu Perfil</Text>
          <Text className="text-white font-black text-xl">{jogadorAtual.nome}</Text>
          <Text className="text-slate-400 text-xs mt-0.5">
            {jogadorAtual.tipo || 'AVULSO'} • Nível {jogadorAtual.nivel || 3} • {jogadorAtual.historicoPresencas || 0} presenças
          </Text>
          <TouchableOpacity
            onPress={trocarJogador}
            className="flex-row items-center gap-2 mt-4 px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10"
          >
            <FontAwesome5 name="sync-alt" size={12} color="#94a3b8" />
            <Text className="text-slate-400 font-bold text-xs">Trocar jogador</Text>
          </TouchableOpacity>
        </View>

        {/* Análise do jogador */}
        <View className="bg-slate-800/45 p-5 rounded-3xl border border-white/5 mb-5">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center gap-2">
              <FontAwesome5 name="chart-bar" size={14} color="#22d3ee" />
              <Text className="text-white font-bold text-sm">Análise do jogador</Text>
            </View>
            {!painelItem.historicoSuficiente && (
              <Text className="text-[8px] font-extrabold uppercase text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full">
                insuficiente
              </Text>
            )}
          </View>
          <Text className="text-slate-500 text-[10px] mb-4">
            {painelItem.historicoSuficiente
              ? 'Baseada nas partidas concluídas, presença e força estimada.'
              : 'Continue jogando para estimar sua força com confiança a partir de 8 partidas.'}
          </Text>
          <View className="flex-row flex-wrap justify-between mb-4">
            <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3.5 border border-white/5 mb-2">
              <Text className="text-[9px] uppercase font-extrabold text-slate-500">Partidas</Text>
              <Text className="text-lg font-black text-white">{painelItem.jogos || '—'}</Text>
              <Text className="text-[9px] font-bold text-slate-400">{painelItem.vitorias} vitória(s)</Text>
            </View>
            <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3.5 border border-white/5 mb-2">
              <Text className="text-[9px] uppercase font-extrabold text-slate-500">Aproveitamento</Text>
              <Text className={`text-lg font-black ${painelItem.aproveitamento >= 60 ? 'text-emerald-400' : painelItem.aproveitamento >= 40 ? 'text-cyan-300' : 'text-white'}`}>
                {painelItem.jogos ? `${painelItem.aproveitamento}%` : '—'}
              </Text>
              <Text className="text-[9px] font-bold text-slate-400">de vitórias</Text>
            </View>
            <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3.5 border border-white/5">
              <Text className="text-[9px] uppercase font-extrabold text-slate-500">Presença</Text>
              <Text className="text-lg font-black text-white">{painelItem.presencas}</Text>
              <Text className="text-[9px] font-bold text-slate-400">{painelItem.presencas === 1 ? 'presença' : 'presenças'}</Text>
            </View>
            <View className="w-[48%] bg-slate-900/40 rounded-2xl p-3.5 border border-white/5">
              <Text className="text-[9px] uppercase font-extrabold text-slate-500">Força estimada</Text>
              <Text className={`text-lg font-black ${painelItem.historicoSuficiente ? 'text-cyan-300' : 'text-slate-600'}`}>
                {painelItem.historicoSuficiente ? `⭐ ${painelItem.forca.toFixed(1)}` : '—'}
              </Text>
              <Text className="text-[9px] font-bold text-slate-400">{painelItem.jogos ? `${painelItem.jogos} de 8 partidas` : 'na criação → 3.0'}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2 bg-slate-900/40 rounded-2xl px-4 py-3 border border-white/5">
            <FontAwesome5 name="chart-line" size={13} color="#22d3ee" />
            <Text className="text-slate-300 font-bold text-xs">Evolução:</Text>
            {painelItem.serie.length ? (
              <>
                <FontAwesome5 name={tendencia > 0.05 ? 'arrow-up' : tendencia < -0.05 ? 'arrow-down' : 'minus'} size={10} color={corFlecha} />
                <Text className={`text-[11px] font-black ${tendencia > 0.05 ? 'text-emerald-400' : tendencia < -0.05 ? 'text-rose-400' : 'text-slate-500'}`}>
                  {tendencia === 0 ? '0.0' : `${tendencia > 0 ? '+' : '−'}${Math.abs(tendencia).toFixed(1)} pts`}
                </Text>
              </>
            ) : (
              <Text className="text-slate-600 text-[11px] font-bold">sem partidas suficientes ainda</Text>
            )}
          </View>
        </View>

        {/* Histórico do jogador */}
        <View className="bg-slate-800/45 p-5 rounded-3xl border border-white/5 mb-5">
          <View className="flex-row items-center gap-2 mb-4">
            <FontAwesome5 name="history" size={14} color="#34d399" />
            <Text className="text-white font-bold text-sm">Histórico do jogador</Text>
          </View>

          <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Presenças recentes</Text>
          {presencasRecentes.length === 0 ? (
            <Text className="text-slate-500 text-[11px] italic mb-5">Sem presenças registradas ainda.</Text>
          ) : (
            <View className="mb-5">
              {presencasRecentes.map(([data, status]) => (
                <View key={data} className="flex-row items-center justify-between py-2 border-b border-slate-800/60">
                  <Text className="text-slate-300 font-bold text-xs">{formatarData(data)}</Text>
                  <Text className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                    status === 'Confirmado' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  }`}>
                    {status || '—'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Text className="text-[10px] uppercase font-extrabold text-slate-500 mb-2">Partidas recentes</Text>
          {partidasRecentes.length === 0 ? (
            <Text className="text-slate-500 text-[11px] italic">Ainda não participou de partidas concluídas.</Text>
          ) : (
            <View>
              {partidasRecentes.map((partida, i) => (
                <View key={`${partida.data}-${i}`} className="flex-row items-center justify-between py-2 border-b border-slate-800/60">
                  <View className="flex-1 mr-2" style={{ minWidth: 0 }}>
                    <Text className="text-slate-300 font-bold text-xs">{formatarData(partida.data)}</Text>
                    <Text className="text-[9px] text-slate-500 font-bold">{partida.dia || ''} · {partida.time}</Text>
                  </View>
                  <Text className={`text-[10px] font-black ${
                    partida.vitorias === partida.derrotas ? 'text-slate-400' : partida.vitorias > partida.derrotas ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {partida.vitorias}V · {partida.derrotas}D
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Autogerador de avatar aleatório */}
        <View className="bg-slate-800/45 p-5 rounded-3xl border border-white/5 mb-5">
          <View className="flex-row items-center gap-2 mb-1">
            <FontAwesome5 name="magic" size={14} color="#fbbf24" />
            <Text className="text-white font-bold text-sm">Gerar avatar aleatório</Text>
          </View>
          <Text className="text-slate-500 text-[11px] mb-4">Toque até gostar do resultado e depois salve.</Text>
          <View className="flex-row items-center gap-4">
            <Avatar jogador={{ ...jogadorAtual, avatar: avatarSel }} size={84} />
            <TouchableOpacity
              onPress={() => setAvatarSel(gerarAvatarAleatorio())}
              className="flex-row items-center gap-2 bg-violet-600 px-5 py-3 rounded-2xl"
            >
              <FontAwesome5 name="random" size={13} color="#fff" />
              <Text className="text-white font-extrabold text-xs uppercase tracking-wider">Gerar aleatório</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Foto por link */}
        <View className="bg-slate-800/45 p-5 rounded-3xl border border-white/5 mb-5">
          <View className="flex-row items-center gap-2 mb-1">
            <FontAwesome5 name="link" size={13} color="#22d3ee" />
            <Text className="text-white font-bold text-sm">Usar uma foto por link</Text>
          </View>
          <Text className="text-slate-500 text-[11px] mb-3">Cole o endereço (URL) de uma imagem da internet.</Text>
          <TextInput
            value={urlInput}
            onChangeText={setUrlInput}
            placeholder="https://exemplo.com/minha-foto.jpg"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            className="bg-slate-900/70 border border-white/5 rounded-2xl px-4 py-3 text-white text-sm mb-3"
          />
          <TouchableOpacity
            onPress={() => urlInput.trim() && salvar(urlInput.trim())}
            disabled={!urlInput.trim() || salvando}
            className={`rounded-2xl py-3 items-center flex-row justify-center gap-2 ${urlInput.trim() && !salvando ? 'bg-cyan-600' : 'bg-slate-700/60'}`}
          >
            {salvando && <ActivityIndicator size="small" color="#fff" />}
            <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
              {salvando ? 'Salvando...' : 'Usar esta foto'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Ações */}
        <TouchableOpacity
          onPress={() => salvar()}
          disabled={salvando}
          className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 mb-3 ${salvando ? 'bg-emerald-700' : 'bg-emerald-500'}`}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome5 name="save" size={13} color="#fff" />
          )}
          <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
            {salvando ? 'Salvando...' : 'Salvar avatar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => salvar('')}
          disabled={salvando}
          className="rounded-2xl py-4 items-center flex-row justify-center gap-2 bg-slate-800/60 border border-white/10"
        >
          <FontAwesome5 name="trash-alt" size={13} color="#fb7185" />
          <Text className="text-rose-400 font-bold text-xs uppercase tracking-wider">Remover avatar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}