import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, StyleSheet } from 'react-native';
import { WashingMachine, Clock, Wallet, User, Sparkles } from 'lucide-react-native';
import { COLORS } from '../constants/config';
import { useLanguage } from '../context/LanguageContext';

import NewOrderScreen from '../screens/services/NewOrderScreen';
import MyOrdersScreen from '../screens/orders/MyOrdersScreen';
import MemberWalletScreen from '../screens/wallet/MemberWalletScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MemberBottomTabs() {
  const { isVietnamese } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderLight,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="ServicesTab"
        component={NewOrderScreen}
        options={{
          tabBarLabel: isVietnamese ? 'Đặt giặt' : 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <WashingMachine size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="OrdersTab"
        component={MyOrdersScreen}
        options={{
          tabBarLabel: isVietnamese ? 'Đơn hàng' : 'Orders',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Clock size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="WalletTab"
        component={MemberWalletScreen}
        options={{
          tabBarLabel: isVietnamese ? 'Ví tiền' : 'Wallet',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Wallet size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: isVietnamese ? 'Tài khoản' : 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
