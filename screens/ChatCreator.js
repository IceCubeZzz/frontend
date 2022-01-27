import { initializeApp } from "firebase/app";
import {
  getFirestore,
  setDoc,
  addDoc,
  doc,
  collection,
} from "firebase/firestore";
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyBMSgBgaMAlX6hEVOpF-nHfZa6yUmIR-Wk",
  authDomain: "amadeus-fa9d2.firebaseapp.com",
  projectId: "amadeus-fa9d2",
  storageBucket: "amadeus-fa9d2.appspot.com",
  messagingSenderId: "95630763705",
  appId: "1:95630763705:web:9c0d29be52a3d055e69d68",
  measurementId: "G-WB6F7HPW51",
};
initializeApp(firebaseConfig);

const firestore = getFirestore();
const MESSAGE_THREADS_COLLECTION = "Message_threads";

export default function ChatCreator({ navigation }) {
  const [roomName, setRoomName] = useState("");

  async function handleButtonPress() {
    if (roomName.length > 0) {
      // create new thread using firebase & firestore

      let response = await addDoc(
        collection(firestore, MESSAGE_THREADS_COLLECTION),
        {
          text: `${roomName} created`,
          createdAt: new Date().getTime(),
          system: true,
          users: [
            { _id: "TEST_USER_ID_1", displayName: "TEST_1" },
            { _id: "TEST_USER_ID_1", displayName: "TEST_1" },
          ],
        }
      );
      navigation.navigate("ChatList");
    }
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        placeholder="Thread Name"
        onChangeText={(roomName) => setRoomName(roomName)}
      />
      <TouchableOpacity style={styles.button} onPress={handleButtonPress}>
        <Text style={styles.buttonText}>Create chat room</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#dee2eb",
  },
  title: {
    marginTop: 20,
    marginBottom: 30,
    fontSize: 28,
    fontWeight: "500",
  },
  button: {
    backgroundColor: "#2196F3",
    textAlign: "center",
    alignSelf: "center",
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
  },
  textInput: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    fontSize: 18,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderColor: "#aaa",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 5,
    width: 225,
  },
});
