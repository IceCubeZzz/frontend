import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, Text, View, Button } from "react-native";

import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import ChatCreator from "./screens/ChatCreator.js";
import ChatList from "./screens/ChatList.js";
import Messages from "./screens/Messages.js";

const Stack = createStackNavigator();

export default function App() {
  return (
    <NavigationContainer initialRouteName="ChatList">
      <Stack.Navigator>
        <Stack.Screen name="ChatCreator" component={ChatCreator} />
        <Stack.Screen name="ChatList" component={ChatList} />
        <Stack.Screen
          name="Messages"
          component={Messages}
          options={({ route }) => ({
            title: route.params.thread.name,
          })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
