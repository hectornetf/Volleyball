import React, { useState } from 'react';
import { View, Text, Image } from 'react-native';
import { resolverAvatar, parseAvatar, iniciais, corDoNome } from '../utils/avatarUtils';

export default function Avatar({ jogador, nome, size = 40 }) {
  const info = parseAvatar(resolverAvatar(jogador));
  const label = nome || jogador?.nome || '';
  const [erro, setErro] = useState(false);
  const base = { width: size, height: size, borderRadius: size / 2 };

  if (info.tipo === 'gerado') {
    return (
      <View style={[base, { backgroundColor: info.fundo.b, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]}>
        <Text style={{ fontSize: Math.round(size * 0.56), lineHeight: Math.round(size * 0.66) }}>{info.cara}</Text>
      </View>
    );
  }

  if (info.tipo === 'url' && !erro) {
    return (
      <Image
        source={{ uri: info.url }}
        style={[base, { backgroundColor: '#1e293b' }]}
        onError={() => setErro(true)}
      />
    );
  }

  return (
    <View style={[base, { backgroundColor: corDoNome(label), alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#fff', fontWeight: '900', fontSize: Math.round(size * 0.38) }}>
        {iniciais(label)}
      </Text>
    </View>
  );
}