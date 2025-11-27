import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// TODO: Replace with your Firebase project configuration
// You can find these in your Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyBMzMjLGjqVOQ8z0rsefYe3MyA9aVxZf6Y",
  authDomain: "gmexpress-estesi.firebaseapp.com",
  projectId: "gmexpress-estesi",
  storageBucket: "gmexpress-estesi.firebasestorage.app",
  messagingSenderId: "1040254089360",
  appId: "1:1040254089360:web:d44b2ec4d54e860d9fc015"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
