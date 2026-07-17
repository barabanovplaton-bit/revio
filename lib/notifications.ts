"use client";

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type NotificationType = "revisions_submitted" | "project_completed" | "project_unlocked";

export interface Notification {
  id: string;
  ownerUid: string;
  projectId: string;
  projectName: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Timestamp | null;
}

const COLLECTION = "notifications";

export async function createNotification(
  data: Omit<Notification, "id" | "read" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    read: false,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export function subscribeToUserNotifications(
  ownerUid: string,
  cb: (notifications: Notification[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("ownerUid", "==", ownerUid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Notification[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Notification, "id">) });
      });
      cb(list);
    },
    (err) => {
      console.error("subscribeToUserNotifications error:", err);
    }
  );
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), { read: true });
}

export async function markAllNotificationsRead(ownerUid: string): Promise<void> {
  const q = query(
    collection(db, COLLECTION),
    where("ownerUid", "==", ownerUid),
    where("read", "==", false)
  );
  const snap = await getDocs(q);
  const batch = snap.docs.map((d) =>
    updateDoc(doc(db, COLLECTION, d.id), { read: true })
  );
  await Promise.all(batch);
}

export function formatNotificationTime(ts: Timestamp | null): string {
  if (!ts) return "";
  const ms = ts.toMillis();
  const diff = Date.now() - ms;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "только что";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  return `${Math.floor(days / 7)} нед назад`;
}
