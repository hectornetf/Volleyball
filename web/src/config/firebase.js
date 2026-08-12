import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBLHgmtgC2jzxQ0HeeXNE7s2IkWMlv7QFg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "voleizindoscria-42e0a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "voleizindoscria-42e0a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "voleizindoscria-42e0a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "861911679536",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:861911679536:web:65d6685a438b6530ae63f5",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-JFQNF9ZYZ8"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
