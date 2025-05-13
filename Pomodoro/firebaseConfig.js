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

// Khởi tạo Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db = firebase.database();
export const auth = firebase.auth(); // Nếu dùng xác thực
export default firebase;