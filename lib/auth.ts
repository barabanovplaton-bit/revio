"use client";

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { getOrCreateUserProfile } from "./user-profile";

export type { User };

let redirectHandled = false;

/**
 * Вход через Google.
 * В обычном окне — popup. В iframe (превью) — redirect.
 * Popup блокируется браузерами внутри iframe, поэтому проверяем.
 */
export async function signInWithGoogle(): Promise<void> {
  // Если мы внутри iframe — используем redirect
  if (typeof window !== "undefined" && window.self !== window.top) {
    await signInWithRedirect(auth, googleProvider);
    return; // страница перезагрузится после redirect
  }
  // Иначе — popup
  const result = await signInWithPopup(auth, googleProvider);
  await getOrCreateUserProfile(result.user);
}

/** Обработка результата после redirect-входа. Вызывается при монтировании. */
export async function handleRedirectResult(): Promise<User | null> {
  if (redirectHandled) return null;
  redirectHandled = true;
  const result = await getRedirectResult(auth);
  if (result?.user) {
    await getOrCreateUserProfile(result.user);
    return result.user;
  }
  return null;
}

/** Выход. */
export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

/** Подписка на изменения состояния авторизации. */
export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
