"use client";

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import { getOrCreateUserProfile } from "./user-profile";

export type { User };

let redirectHandled = false;

/**
 * Вход через Google.
 * В обычном окне — popup. В iframe (превью) — redirect.
 */
export async function signInWithGoogle(): Promise<void> {
  if (typeof window !== "undefined" && window.self !== window.top) {
    await signInWithRedirect(auth, googleProvider);
    return;
  }
  const result = await signInWithPopup(auth, googleProvider);
  await getOrCreateUserProfile(result.user);
}

/** Обработка результата после redirect-входа. */
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

/**
 * Отправить email-ссылку для входа (passwordless).
 */
export async function sendEmailSignInLink(email: string): Promise<void> {
  const actionCodeSettings = {
    url: typeof window !== "undefined" ? `${window.location.origin}/login` : "/login",
    handleCodeInApp: true,
  };
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  if (typeof window !== "undefined") {
    window.localStorage.setItem("emailForSignIn", email);
  }
}

/** Проверить, открыта ли страница по email-ссылке входа. */
export function isEmailSignInLink(): boolean {
  if (typeof window === "undefined") return false;
  return isSignInWithEmailLink(auth, window.location.href);
}

/** Завершить вход по email-ссылке. */
export async function completeEmailSignIn(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  if (!isEmailSignInLink()) return null;
  let email = window.localStorage.getItem("emailForSignIn");
  if (!email) {
    email = window.prompt("Введите email для подтверждения входа");
    if (!email) return null;
  }
  const result = await signInWithEmailLink(auth, email, window.location.href);
  window.localStorage.removeItem("emailForSignIn");
  await getOrCreateUserProfile(result.user);
  return result.user;
}

/** Выход. */
export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

/** Подписка на изменения состояния авторизации. */
export function subscribeToAuth(cb: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
