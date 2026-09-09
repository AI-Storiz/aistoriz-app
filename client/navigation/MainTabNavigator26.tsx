import React from "react";
import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";

import CreateStackNavigator from "@/navigation/CreateStackNavigator";
import ProfileStackNavigator from "@/navigation/ProfileStackNavigator";

export type MainTabParamList = {
  HomeTab: undefined;
  ProfileTab: undefined;
};

const Tab = createNativeBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator26() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={CreateStackNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) =>
            focused
              ? { type: "sfSymbol", name: "house.fill" }
              : { type: "sfSymbol", name: "house" },
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) =>
            focused
              ? { type: "sfSymbol", name: "person.fill" }
              : { type: "sfSymbol", name: "person" },
        }}
      />
    </Tab.Navigator>
  );
}
