"use client";

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type MarkerType = "point" | "general";

export interface Marker {
  id: string;
  projectId: string;
  round: number; // номер круга правок
  type: MarkerType;
  /** Позиция точечного маркера (relative координаты 0-1) */
  x?: number;
  y?: number;
  /** Текст правки */
  text: string;
  /** Создан в */
  createdAt: Timestamp | null;
}

const COLLECTION = "markers";

/**
 * Создать маркер
 */
export async function createMarker(
  data: Omit<Marker, "id" | "createdAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Получить маркер по id
 */
export async function getMarker(id: string): Promise<Marker | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Marker, "id">) };
}

/**
 * Получить все маркеры проекта по кругу
 */
export async function getProjectMarkers(
  projectId: string,
  round: number
): Promise<Marker[]> {
  const q = query(
    collection(db, COLLECTION),
    where("projectId", "==", projectId),
    where("round", "==", round)
  );
  const snap = await getDocs(q);
  const markers: Marker[] = [];
  snap.forEach((d) => {
    markers.push({ id: d.id, ...(d.data() as Omit<Marker, "id">) });
  });
  return markers;
}

/**
 * Подписка на маркеры проекта по кругу (realtime)
 */
export function subscribeToProjectMarkers(
  projectId: string,
  round: number,
  cb: (markers: Marker[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("projectId", "==", projectId),
    where("round", "==", round)
  );
  return onSnapshot(
    q,
    (snap) => {
      const markers: Marker[] = [];
      snap.forEach((d) => {
        markers.push({ id: d.id, ...(d.data() as Omit<Marker, "id">) });
      });
      cb(markers);
    },
    (err) => {
      console.error("subscribeToProjectMarkers error:", err);
    }
  );
}

/**
 * Обновить маркер
 */
export async function updateMarker(
  id: string,
  data: Partial<Marker>
): Promise<void> {
  const { id: _omit, ...rest } = data;
  await updateDoc(doc(db, COLLECTION, id), rest);
}

/**
 * Удалить маркер
 */
export async function deleteMarker(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

/**
 * Удалить все маркеры проекта по кругу
 */
export async function deleteProjectMarkers(
  projectId: string,
  round: number
): Promise<void> {
  const markers = await getProjectMarkers(projectId, round);
  await Promise.all(markers.map((m) => deleteMarker(m.id)));
}

/**
 * Подписка на ВСЕ маркеры проекта (все круги, realtime)
 */
export function subscribeToAllProjectMarkers(
  projectId: string,
  cb: (markers: Marker[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("projectId", "==", projectId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const markers: Marker[] = [];
      snap.forEach((d) => {
        markers.push({ id: d.id, ...(d.data() as Omit<Marker, "id">) });
      });
      cb(markers);
    },
    (err) => {
      console.error("subscribeToAllProjectMarkers error:", err);
    }
  );
}