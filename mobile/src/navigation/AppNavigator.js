import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Zap } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/config';
import AuthStack from './AuthStack';
import MemberBottomTabs from './MemberBottomTabs';

const RootStack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated, initializing } = useAuth();

  if (initializing) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogo}>
          <Zap size={36} color={COLORS.white} fill={COLORS.white} />
        </View>
        <Text style={styles.splashTitle}>LaundroChain</Text>
        <Text style={styles.splashSub}>Hệ sinh thái giặt sấy thông minh</Text>
        <ActivityIndicator size="small" color={COLORS.white} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <NavigationContainer key={isAuthenticated ? 'auth-main' : 'auth-login'}>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <RootStack.Screen name="MainTabs" component={MemberBottomTabs} />
        ) : (
          <RootStack.Screen name="AuthStack" component={AuthStack} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  splashLogo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#243447',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.white,
    letterSpacing: -0.5,
  },
  splashSub: {
    fontSize: 14,
    color: COLORS.secondaryLight,
    fontWeight: '600',
    marginTop: 6,
  },
});
