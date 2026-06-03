import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import AddCharacterScreen from "@/screens/AddCharacterScreen";
import GeneratingScreen from "@/screens/GeneratingScreen";
import PreviewScreen from "@/screens/PreviewScreen";
import AuthScreen from "@/screens/AuthScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import ResetPasswordScreen from "@/screens/ResetPasswordScreen";
import EmailVerificationScreen from "@/screens/EmailVerificationScreen";
import EarnCreditsScreen from "@/screens/EarnCreditsScreen";
import SubscriptionScreen from "@/screens/SubscriptionScreen";
import AboutScreen from "@/screens/AboutScreen";
import PrivacyScreen from "@/screens/PrivacyScreen";
import AccountDeletionScreen from "@/screens/AccountDeletionScreen";
import TermsScreen from "@/screens/TermsScreen";
import StoryHintsScreen from "@/screens/StoryHintsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { Colors } from "@/constants/theme";

export type RootStackParamList = {
  Auth: undefined;
  ForgotPassword: undefined;
  ResetPassword: { email?: string };
  EmailVerification: undefined;
  Main: undefined;
  AddCharacter: undefined;
  Generating: {
    storyPrompt: string;
    style: string;
    characters: Array<{ name: string; type: string; imageUri?: string; description?: string }>;
    pagesCount: number;
    scenesPerPage: number;
    title?: string;
    language?: string;
  };
  Preview: {
    projectId?: number;
    pages?: Array<{ pageNumber: number; imageUrl: string; panelImages?: string[]; scenes?: any; panels?: any[]; pageType?: string }>;
    isReadOnly?: boolean;
    alreadySaved?: boolean;
    title?: string;
  };
  EarnCredits: undefined;
  Subscription: undefined;
  About: undefined;
  Privacy: undefined;
  AccountDeletion: undefined;
  Terms: undefined;
  StoryHints: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isEmailVerified, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.light.backgroundRoot }}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions} id="RootStack">
      {!isAuthenticated ? (
        <>
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ResetPassword"
            component={ResetPasswordScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{
              presentation: "modal",
              headerTitle: "Privacy Policy",
            }}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Terms of Service",
            }}
          />
        </>
      ) : !isEmailVerified ? (
        <Stack.Screen
          name="EmailVerification"
          component={EmailVerificationScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddCharacter"
            component={AddCharacterScreen}
            options={{
              presentation: "modal",
              headerTitle: "Add Character",
            }}
          />
          <Stack.Screen
            name="Generating"
            component={GeneratingScreen}
            options={{
              presentation: "fullScreenModal",
              headerShown: false,
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="Preview"
            component={PreviewScreen}
            options={{
              presentation: "modal",
              headerTitle: "Your Comic",
            }}
          />
          <Stack.Screen
            name="EarnCredits"
            component={EarnCreditsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Earn Credits",
            }}
          />
          <Stack.Screen
            name="Subscription"
            component={SubscriptionScreen}
            options={{
              presentation: "modal",
              headerTitle: "Get Credits",
            }}
          />
          <Stack.Screen
            name="About"
            component={AboutScreen}
            options={{
              presentation: "modal",
              headerTitle: "About",
            }}
          />
          <Stack.Screen
            name="Privacy"
            component={PrivacyScreen}
            options={{
              presentation: "modal",
              headerTitle: "Privacy Policy",
            }}
          />
          <Stack.Screen
            name="AccountDeletion"
            component={AccountDeletionScreen}
            options={{
              presentation: "modal",
              headerTitle: "Delete Account",
            }}
          />
          <Stack.Screen
            name="Terms"
            component={TermsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Terms of Service",
            }}
          />
          <Stack.Screen
            name="StoryHints"
            component={StoryHintsScreen}
            options={{
              presentation: "modal",
              headerTitle: "Story Hints",
            }}
          />
                  </>
      )}
    </Stack.Navigator>
  );
}
