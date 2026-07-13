// Инициализация Firebase.
// Конфиг публичный — это нормально для клиентских SDK.
// Безопасность обеспечивается правилами Firestore/Storage (позже).

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyClV-w-de_6iQBR4IVy6MXv18ag1CrJGGM",
  authDomain: "revio-b6e27.firebaseapp.com",
  projectId: "revio-b6e27",
  storageBucket: "revio-b6e27.firebasestorage.app",
  messagingSenderId: "26604781159",
  appId: "1:26604781159:web:abeeb81beba502961c9ec2",
  measurementId: "G-E1G47MMY88",
};

// Next.js hot-reload может дважды инициализировать app — guarded
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
// Чтобы всегда показывать выбор аккаунта
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db = getFirestore(app);
