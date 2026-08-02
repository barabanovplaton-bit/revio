"use client";

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type FeedbackCategory = "bug" | "idea" | "other";

export interface Feedback {
  id: string;
  type: FeedbackCategory;
  text: string;
  email?: string;
  userId?: string;
  url?: string;
  read?: boolean;
  createdAt: Timestamp | null;
}

const COLLECTION = "feedback";

export async function addFeedback(
  data: Omit<Feedback, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export function subscribeFeedback(cb: (list: Feedback[]) => void): () => void {
  const q = query(
    collection(db, COLLECTION),
    orderBy("createdAt", "desc"),
    limit(200)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Feedback[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Feedback, "id">) });
      });
      cb(list);
    },
    (err) => {
      console.error("subscribeFeedback error:", err);
    }
  );
}

export async function markFeedbackRead(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { read: true });
}

/** UID владельца (для просмотра отзывов). Задаётся в Vercel: NEXT_PUBLIC_OWNER_UID */
export const OWNER_UIDS = new Set(
  (process.env.NEXT_PUBLIC_OWNER_UID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
