// firebaseConfig.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/database'; // Cho Realtime Database
import 'firebase/compat/auth';   // Nếu bạn sử dụng xác thực

const firebaseConfig = {
  apiKey: "AIzaSyA1ikdSMhtxXilJY30vuQxxXz8etBMveyk",
  authDomain: "hlc-de97c.firebaseapp.com",
  databaseURL: "https://hlc-de97c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hlc-de97c",
  storageBucket: "hlc-de97c.firebasestorage.app",
  messagingSenderId: "77480527326",
  appId: "1:77480527326:web:cd40e168a89e7868a0c94f",
};


if (!firebase.apps.length) {
  console.log("ANDROID LOG - FirebaseConfig.js: Initializing Firebase app...");
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("ANDROID LOG - FirebaseConfig.js: Firebase app INITIALIZED. Apps length:", firebase.apps.length);
  } catch (e) {
    console.error("ANDROID LOG - FirebaseConfig.js: Error initializing app:", e);
  }
} else {
  console.log("ANDROID LOG - FirebaseConfig.js: Firebase app ALREADY initialized. Apps length:", firebase.apps.length);
}

export const db = firebase.database();
export const auth = firebase.auth(); 
export default firebase;