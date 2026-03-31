/**
 * Main App Navigator
 *
 * - Auth Stack: Login, Register
 * - Onboarding: 5-step profile wizard
 * - Main Tabs: Discover, Matches, Groups, Profile
 * - Chat Stack: Chat screen
 * - Proposal Stack: Create/View proposals
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { ActivityIndicator, View } from 'react-native';
import { COLORS, ACTIVITY_EMOJIS } from '../constants/theme';

// Screens (to be built in later tasks)
// import LoginScreen from '../screens/LoginScreen';
// import RegisterScreen from '../screens/RegisterScreen';
// import DiscoverScreen from '../screens/DiscoverScreen';
// import MatchesScreen from '../screens/MatchesScreen';
// import GroupsScreen from '../screens/GroupsScreen';
// import ProfileScreen from '../screens/ProfileScreen';
// import ChatScreen from '../screens/ChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder component
const PlaceholderScreen = ({ name }) => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color={COLORS.primary} />
  </View>
);

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" children={() => <PlaceholderScreen name="Login" />} />
      <Stack.Screen name="Register" children={() => <PlaceholderScreen name="Register" />} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Discover"
        children={() => <PlaceholderScreen name="Discover" />}
        options={{ tabBarLabel: 'Discover', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Matches"
        children={() => <PlaceholderScreen name="Matches" />}
        options={{ tabBarLabel: 'Matches', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Groups"
        children={() => <PlaceholderScreen name="Groups" />}
        options={{ tabBarLabel: 'Groups', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Profile"
        children={() => <PlaceholderScreen name="Profile" />}
        options={{ tabBarLabel: 'Profile', tabBarIcon: () => null }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" children={() => <PlaceholderScreen name="Chat" />} />
      <Stack.Screen name="GroupChat" children={() => <PlaceholderScreen name="GroupChat" />} />
      <Stack.Screen name="ProposalCreate" children={() => <PlaceholderScreen name="ProposalCreate" />} />
      <Stack.Screen name="ProposalView" children={() => <PlaceholderScreen name="ProposalView" />} />
      <Stack.Screen name="UserProfile" children={() => <PlaceholderScreen name="UserProfile" />} />
      <Stack.Screen name="SafetyCenter" children={() => <PlaceholderScreen name="SafetyCenter" />} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, isInitialized } = useSelector((state) => state.auth);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
