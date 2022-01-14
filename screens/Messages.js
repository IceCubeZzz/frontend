import React, { useState, useEffect } from "react";
import { GiftedChat } from "react-native-gifted-chat";
import * as SQLite from "expo-sqlite";
import {
  getFirestore,
  collection,
  setDoc,
  getDoc,
  addDoc,
  getDocs,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  enableIndexedDbPersistence,
} from "firebase/firestore";

const firestore = getFirestore();
const db = SQLite.openDatabase("db.messageCache"); // returns database object if exists. Creates new one if does not exist

// not compatable with expo it seems
// enableIndexedDbPersistence(firestore).catch((err) => {
//   if (err.code == "failed-precondition") {
//     // Multiple tabs open, persistence can only be enabled
//     // in one tab at a a time.
//     // TODO
//   } else if (err.code == "unimplemented") {
//     // The current browser does not support all of the
//     // features required to enable persistence
//     // TODO
//   }
// });

const MESSAGE_COLLECTION = "Messages";
const MESSAGE_THREADS_COLLECTION = "Message_threads";

export default function Messages({ route }) {
  const { thread } = route.params;

  const messageThreadsCollection = collection(
    firestore,
    MESSAGE_THREADS_COLLECTION
  );
  const currentThreadRef = doc(messageThreadsCollection, thread._id);
  const messageCollection = collection(currentThreadRef, MESSAGE_COLLECTION);

  async function handleSend(newMessage = []) {
    setMessages(GiftedChat.append(messages, newMessage));
    const { _id, createdAt, text, user } = newMessage[0];
    await addDoc(messageCollection, {
      _id,
      createdAt,
      text,
      fromUser: {
        _id: user._id,
        displayName: "TEST_1",
      },
    });

    await setDoc(
      currentThreadRef,
      {
        latestMessage: {
          text,
          createdAt: new Date().getTime(),
        },
      },
      { merge: true }
    );

    // add message to local message cache
    // db.transaction((tx) => {
    //   tx.executeSql("INSERT INTO messageCache VALUES(?, ?, ?, ?, ?)", [
    //     _id,
    //     createdAt,
    //     text,
    //     user._id,
    //     user.displayName,
    //   ]);
    // });
  }

  const [messages, setMessages] = useState([
    {
      _id: GiftedChat.defaultProps.messageIdGenerator(),
      text: "chat created",
      createdAt: new Date().getTime(),
      system: true,
    },
    {
      _id: 1000000000,
      text: "Hello!",
      createdAt: new Date().getTime(),
      user: {
        _id: "TEST_USER_ID_2",
        name: "TEST_2",
      },
    },
  ]);

  useEffect(() => {
    function populateMessages() {
      // create table if it does not yet exist
      db.transaction((tx) => {
        tx.executeSql(
          "CREATE TABLE IF NOT EXISTS messageCache (chat_id TEXT, message_id TEXT, created_at TEXT, text TEXT, sender_id INTEGER, sender_name TEXT)"
        );
      });

      // retrieve previous messages from cache
      db.transaction((tx) => {
        tx.executeSql(
          "SELECT * FROM messageCache WHERE chat_id = ?",
          [thread._id],
          (txObj, resultSet) => {
            const cachedMessages = [];
            // loop through result set, adding each message to cachedMessages array
            resultSet.rows._array.forEach((element) =>
              cachedMessages.push({
                _id: element.message_id,
                text: element.text,
                createdAt: element.created_at,
                user: {
                  _id: element.sender_id,
                  name: element.sender_name,
                },
              })
            );
            // add cachedMessages to GiftedChat
            setMessages(GiftedChat.append(messages, cachedMessages));
          },
          (txObj, error) => console.log("Error", error)
        );
      });
    }
    // populate message list
    populateMessages();

    const messageRetrievalQuery = query(
      messageCollection,
      orderBy("createdAt", "desc")
    );

    // fetch previous messages
    const unsubscribe = onSnapshot(messageRetrievalQuery, (querySnapshot) => {
      const newMessages = querySnapshot.docs.map((thread_doc) => {
        const firebaseData = thread_doc.data();

        const data = {
          _id: thread_doc["_id"],
          text: "",
          createdAt: new Date().getTime(),
          ...firebaseData,
        };

        if (!firebaseData.system) {
          data.user = {
            ...firebaseData.user,
            name: firebaseData.user.displayName,
          };
        }

        return data;
      });

      // fix date formatting on each message
      newMessages.forEach((message) => {
        message["createdAt"] = message["createdAt"].toDate();
        if (message["createdAt"] <= messages[messages.length - 1]) {
          newMessages.shift();
        }
      });

      setMessages(GiftedChat.append(messages, newMessages));
    });

    return () => unsubscribe();
  }, []);

  return (
    <GiftedChat
      messages={messages}
      onSend={handleSend}
      user={{
        _id: "TEST_USER_ID_1", //TODO: USER ID
      }}
    />
  );
}
