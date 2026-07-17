"use client";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "./auth";

export type Occupation =
  | "web-designer"
  | "card-designer"
  | "interior-designer"
  | "illustrator"
  | "photographer"
  | "other";

export type ReferralSource =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "vk"
  | "telegram"
  | "ai"
  | "search"
  | "friend"
  | "other"
  | "none";

// Совместимость со старыми значениями (если меняли тип)

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  occupation: Occupation | null;
  referralSource: ReferralSource | null;
  onboardingCompleted: boolean;
  plan: "free" | "pro";
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

const COLLECTION = "users";

/**
 * Получает существующий профиль или создаёт новый (для первого входа).
 * Возвращает профиль + флаг onboardingRequired.
 */
export async function getOrCreateUserProfile(
  user: User
): Promise<{ profile: UserProfile; isNew: boolean }> {
  const ref = doc(db, COLLECTION, user.uid);
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    return {
      profile: data,
      isNew: !data.onboardingCompleted,
    };
  }

  // Новый пользователь
  const newProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    occupation: null,
    referralSource: null,
    onboardingCompleted: false,
    plan: "free",
    createdAt: null,
    updatedAt: null,
  };

  await setDoc(ref, {
    ...newProfile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { profile: newProfile, isNew: true };
}

/** Сохраняет ответы онбординга. */
export async function saveOnboarding(
  uid: string,
  data: {
    displayName: string;
    occupation: Occupation;
    referralSource: ReferralSource;
  }
): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  await setDoc(
    ref,
    {
      displayName: data.displayName,
      occupation: data.occupation,
      referralSource: data.referralSource,
      onboardingCompleted: true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/** Получить профиль по uid (для последующей загрузки после входа). */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/** Обновить имя пользователя. */
export async function updateDisplayName(
  uid: string,
  displayName: string
): Promise<void> {
  const ref = doc(db, COLLECTION, uid);
  await setDoc(ref, { displayName, updatedAt: serverTimestamp() }, { merge: true });
}
