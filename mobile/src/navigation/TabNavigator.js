import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import DashboardScreen from '../screens/DashboardScreen';
import PresencaScreen from '../screens/PresencaScreen';
import TimesScreen from '../screens/TimesScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import AdminScreen from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
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
