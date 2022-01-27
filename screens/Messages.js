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

  async function handleSend(newMessage = []) {
    setMessages(GiftedChat.append(messages, newMessage));
    const { _id, createdAt, text, user } = newMessage[0];

    // add message to local message cache
    db.transaction(
      (tx) => {
        tx.executeSql(
          "INSERT INTO text_cache (chat_id, message_id, created_at, text, sender_id, sender_name) VALUES (?, ?, ?, ?, ?, ?)",
          [thread._id, _id, createdAt.getTime(), text, user._id, user.name],
          (txObj, resultSet) => {
            console.log("Inserted into cache: ", resultSet);
          },
          (txObj, error) => {
            console.log("Error inserting message: ", error);
          }
        );
      },
      (error) => {
        console.log("Error with insertion transaction: ", error);
      }
    );

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
  }

  useEffect(() => {
    const cachedMessages = [];
    function populateMessages() {
      // create table if it does not yet exist
      db.transaction(
        (tx) => {
          tx.executeSql(
            "CREATE TABLE IF NOT EXISTS text_cache (chat_id TEXT, message_id TEXT, created_at TEXT, text TEXT, sender_id INTEGER, sender_name TEXT)",
            [],
            (txObj, resultSet) => {},
            (txObj, error) => console.log("Error creating table: ", error)
          );
        },
        (error) => {
          console.log("Error with creation transaction: ", error);
        }
      );

      // retrieve previous messages from cache
      db.transaction(
        (tx) => {
          tx.executeSql(
            //"SELECT * FROM text_cache ORDER BY created_at DESC",
            "SELECT * FROM text_cache WHERE chat_id=? ORDER BY created_at DESC",
            [thread._id],
            (txObj, resultSet) => {
              // loop through result set, adding each message to cachedMessages array
              resultSet.rows._array.forEach((element) => {
                cachedMessages.push({
                  _id: element.message_id,
                  text: element.text,
                  createdAt: element.created_at,
                  user: {
                    _id: element.sender_id,
                    name: element.sender_name,
                  },
                });
              });
              // add cachedMessages to GiftedChat
              setMessages(GiftedChat.append(messages, cachedMessages));
            },
            (txObj, error) => {
              console.log("Error retrieving cached messages: ", error);
            }
          );
        },
        (error) => {
          console.log("Error with cache retrieval: ", error);
        }
      );
    }
    // populate message list
    populateMessages();

    // retrieve last cached message time
    latestMessageTime = 0;
    cachedMessages.forEach((message) => {
      //newMessageTime = parseInt(message["createdAt"]);
      newMessageTime = parseInt(message["createdAt"]);
      if (latestMessageTime == 0 || newMessageTime > latestMessageTime) {
        latestMessageTime = newMessageTime;
      }
    });

    const messageRetrievalQuery = query(
      messageCollection,
      orderBy("createdAt", "desc"),
      where("createdAt", ">", latestMessageTime)
    );

    // fetch new messages
    const unsubscribe = onSnapshot(messageRetrievalQuery, (querySnapshot) => {
      const newMessages = querySnapshot.docs.map((thread_doc) => {
        const firebaseData = thread_doc.data();

        const data = {
          _id: thread_doc["_id"],
          text: thread_doc["text"],
          createdAt: new Date(thread_doc["createdAt"]).getTime(),
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

      // add message to local message cache if it has not been cached already
      newMessages.forEach(
        (message) => {
          db.transaction(
            (tx) => {
              tx.executeSql(
                "INSERT INTO text_cache (chat_id, message_id, created_at, text, sender_id, sender_name) VALUES (?, ?, ?, ?, ?, ?)",
                [
                  thread._id,
                  message._id,
                  message._createdAt,
                  message._text,
                  message._user._id,
                  message._user.displayName,
                ]
              );
            },
            (txObj, resultSet) => {},
            (txObj, error) => {
              console.log("Error inserting retrieved messages: ", error);
            }
          );
        },
        (txObj, error) => {
          console.log("Error with inserting retrieved messages: ", error);
        }
      );

      setMessages(
        GiftedChat.append(messages, cachedMessages.concat(newMessages))
      );
    });

    return () => unsubscribe();
  }, []);

  return (
    <GiftedChat
      messages={messages}
      onSend={handleSend}
      user={{
        _id: "TEST_USER_ID_1", //TODO: USER ID
        name: "TEST_1",
      }}
    />
  );
}
