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
import { COLORS } from '../constants/theme';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileWizardScreen from '../screens/ProfileWizardScreen';
// Main screens
import DiscoverScreen from '../screens/DiscoverScreen';
import MatchesScreen from '../screens/MatchesScreen';
import ChatScreen from '../screens/ChatScreen';
import ProposalCreateScreen from '../screens/ProposalCreateScreen';
import ProposalViewScreen from '../screens/ProposalViewScreen';
import GroupsScreen from '../screens/GroupsScreen';
import GroupCreateScreen from '../screens/GroupCreateScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import GroupChatScreen from '../screens/GroupChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SafetyCenterScreen from '../screens/SafetyCenterScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import CommunityGuidelinesScreen from '../screens/CommunityGuidelinesScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';

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
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
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
        component={DiscoverScreen}
        options={{ tabBarLabel: 'Discover', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ tabBarLabel: 'Matches', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ tabBarLabel: 'Groups', tabBarIcon: () => null }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile', tabBarIcon: () => null }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="GroupChat" component={GroupChatScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GroupCreate" component={GroupCreateScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProposalCreate" component={ProposalCreateScreen} />
      <Stack.Screen name="ProposalView" component={ProposalViewScreen} />
      <Stack.Screen name="UserProfile" children={() => <PlaceholderScreen name="UserProfile" />} />
      <Stack.Screen name="SafetyCenter" component={SafetyCenterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} options={{ headerShown: false }} />
      <Stack.Screen name="CommunityGuidelines" component={CommunityGuidelinesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProfileEdit" children={() => <PlaceholderScreen name="ProfileEdit" />} options={{ headerShown: false }} />
      <Stack.Screen name="Preferences" children={() => <PlaceholderScreen name="Preferences" />} options={{ headerShown: false }} />
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
      {!user ? (
        <AuthStack />
      ) : !user.profileComplete ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="ProfileWizard" component={ProfileWizardScreen} />
        </Stack.Navigator>
      ) : (
        <MainStack />
      )}
    </NavigationContainer>
  );
}
