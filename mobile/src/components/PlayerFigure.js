import React from 'react';
import { View, Text } from 'react-native';

const coresCamisa = {
  4: '#dc2626',
  6: '#facc15',
  2: '#16a34a',
  5: '#7e22ce',
  1: '#ea580c',
  3: '#2563eb',
};

export default function PlayerFigure({ posicaoId }) {
  const camisa = coresCamisa[posicaoId] || '#0891b2';
  const textoCamisa = posicaoId === '6' ? '#111827' : '#ffffff';

  return (
    <View style={{ width: 72, height: 88, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', bottom: 1, width: 54, height: 6, borderRadius: 20, backgroundColor: '#020617', opacity: 0.4 }} />
      <View style={{ position: 'absolute', top: 7, left: 25, width: 22, height: 23, borderRadius: 13, backgroundColor: '#d99a70', zIndex: 3 }} />
      <View style={{ position: 'absolute', top: 3, left: 23, width: 27, height: 15, borderTopLeftRadius: 15, borderTopRightRadius: 15, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#171717', zIndex: 4 }} />
      <View style={{ position: 'absolute', top: 12, left: 21, width: 9, height: 11, borderTopLeftRadius: 10, backgroundColor: '#171717', transform: [{ rotate: '-24deg' }], zIndex: 4 }} />
      <View style={{ position: 'absolute', top: 26, left: 32, width: 9, height: 8, backgroundColor: '#d99a70', zIndex: 2 }} />
      <View style={{ position: 'absolute', top: 31, left: 14, width: 12, height: 25, borderRadius: 8, backgroundColor: '#d99a70', transform: [{ rotate: '22deg' }], zIndex: 1 }} />
      <View style={{ position: 'absolute', top: 42, left: 12, width: 10, height: 20, borderRadius: 7, backgroundColor: '#c9825b', transform: [{ rotate: '-20deg' }], zIndex: 1 }} />
      <View style={{ position: 'absolute', top: 31, right: 14, width: 12, height: 25, borderRadius: 8, backgroundColor: '#d99a70', transform: [{ rotate: '-22deg' }], zIndex: 1 }} />
      <View style={{ position: 'absolute', top: 42, right: 12, width: 10, height: 20, borderRadius: 7, backgroundColor: '#c9825b', transform: [{ rotate: '20deg' }], zIndex: 1 }} />
      <View style={{ position: 'absolute', top: 30, left: 21, width: 30, height: 34, borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: camisa, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', zIndex: 2 }}>
        <Text style={{ color: textoCamisa, fontSize: 19, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.22)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>{posicaoId}</Text>
      </View>
      <View style={{ position: 'absolute', top: 59, left: 20, width: 32, height: 13, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: '#111827', zIndex: 2 }} />
      <View style={{ position: 'absolute', top: 68, left: 19, width: 13, height: 14, borderRadius: 6, backgroundColor: '#d99a70', transform: [{ rotate: '28deg' }], zIndex: 1 }} />
      <View style={{ position: 'absolute', top: 68, right: 19, width: 13, height: 14, borderRadius: 6, backgroundColor: '#d99a70', transform: [{ rotate: '-28deg' }], zIndex: 1 }} />
      <View style={{ position: 'absolute', top: 72, left: 11, width: 13, height: 9, borderRadius: 4, backgroundColor: '#111827', transform: [{ rotate: '25deg' }], borderWidth: 1, borderColor: '#64748b', zIndex: 2 }} />
      <View style={{ position: 'absolute', top: 72, right: 11, width: 13, height: 9, borderRadius: 4, backgroundColor: '#111827', transform: [{ rotate: '-25deg' }], borderWidth: 1, borderColor: '#64748b', zIndex: 2 }} />
      <View style={{ position: 'absolute', bottom: 1, left: 3, width: 22, height: 7, borderRadius: 5, backgroundColor: '#e2e8f0', transform: [{ rotate: '-8deg' }], borderWidth: 1, borderColor: '#64748b', zIndex: 3 }} />
      <View style={{ position: 'absolute', bottom: 1, right: 3, width: 22, height: 7, borderRadius: 5, backgroundColor: '#e2e8f0', transform: [{ rotate: '8deg' }], borderWidth: 1, borderColor: '#64748b', zIndex: 3 }} />
    </View>
  );
}
