import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import CreateScreen from "@/screens/CreateScreen";
import SubscriptionScreen from "@/screens/SubscriptionScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type CreateStackParamList = {
  Create: undefined;
  Subscription: undefined;
};

const Stack = createNativeStackNavigator<CreateStackParamList>();

export default function CreateStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Create"
        component={CreateScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{
          headerTitle: "Get Credits",
        }}
      />
    </Stack.Navigator>
  );
}
