import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import PresencaScreen from '../screens/PresencaScreen';
import TimesScreen from '../screens/TimesScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import HistoryScreen from '../screens/HistoryScreen';
import AdminScreen from '../screens/AdminScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

import { useSession } from '../context/SessionContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { activeGroupId, loading } = useSession();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View className="flex-1 bg-[#0b0f1a] justify-center items-center">
        <ActivityIndicator size="large" color="#22d3ee" />
      </View>
    );
  }

  // Se o App não tem uma sessão ativa (Código de Grupo), aparece a tela de boas-vindas
  // Sem login e senha - apenas o código agora!
  if (!activeGroupId) {
    return <WelcomeScreen />;
  }

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { 
          position: 'absolute',
          bottom: Math.max(insets.bottom + 10, 20),
          left: 20,
          right: 20,
          elevation: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.97)',
          borderRadius: 25,
          height: 65,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.05)',
          paddingBottom: 0,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b'
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard" size={24} color={color} /> }} />
      <Tab.Screen name="Presença" component={PresencaScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-check" size={24} color={color} /> }} />
      <Tab.Screen name="Times" component={TimesScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group" size={24} color={color} /> }} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="wallet" size={24} color={color} /> }} />
      <Tab.Screen name="Histórico" component={HistoryScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="history" size={24} color={color} /> }} />
      <Tab.Screen name="Admin" component={AdminScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-cog" size={24} color={color} /> }} />
    </Tab.Navigator>
  );
}
