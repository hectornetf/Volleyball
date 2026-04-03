import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import PresencaScreen from '../screens/PresencaScreen';
import TimesScreen from '../screens/TimesScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import AdminScreen from '../screens/AdminScreen';
import WelcomeScreen from '../screens/WelcomeScreen';

import { useSession } from '../context/SessionContext';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { activeGroupId, loading } = useSession();

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
        headerStyle: { backgroundColor: '#0b0f1a' },
        headerTintColor: '#f1f5f9',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b'
      }}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="view-dashboard" size={24} color={color} /> }} />
      <Tab.Screen name="Presença" component={PresencaScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="calendar-check" size={24} color={color} /> }} />
      <Tab.Screen name="Times" component={TimesScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-group" size={24} color={color} /> }} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="wallet" size={24} color={color} /> }} />
      <Tab.Screen name="Admin" component={AdminScreen} options={{ tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-cog" size={24} color={color} /> }} />
    </Tab.Navigator>
  );
}
