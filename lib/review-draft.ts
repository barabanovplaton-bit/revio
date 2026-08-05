"use client";

import type { MarkerType } from "./markers";

export interface ReviewDraftItem {
  id: string;
  type: MarkerType;
  x?: number;
  y?: number;
  imageIndex?: number;
  text: string;
  order: number;
}

const DRAFT_EVENT = "revio:draft-changed";

const key = (projectId: string) => `revio:draft:${projectId}`;

export function newDraftId(): string {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
  );
}

export function loadDraft(projectId: string): ReviewDraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key(projectId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveDraft(
  projectId: string,
  items: ReviewDraftItem[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key(projectId), JSON.stringify(items));
  } catch {
    // ignore
  }
  notifyDraftChanged();
}

export function clearDraft(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(projectId));
  } catch {
    // ignore
  }
  notifyDraftChanged();
}

export function notifyDraftChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DRAFT_EVENT));
}

/**
 * Несохранённые точечные правки клиента (поставлены, но не «Добавить»).
 * Хранятся в localStorage и рисуются на фото как маячки, чтобы можно было
 * вернуться, дописать текст и потом добавить в черновик.
 */
export interface PendingPoint {
  id: string;
  x: number;
  y: number;
  imageIndex: number;
  text: string;
  order: number;
}

const PENDING_EVENT = "revio:pending-changed";
const pendingKey = (projectId: string) => `revio:pending:${projectId}`;

export function loadPendingPoints(projectId: string): PendingPoint[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(pendingKey(projectId));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function savePendingPoints(
  projectId: string,
  items: PendingPoint[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pendingKey(projectId), JSON.stringify(items));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(PENDING_EVENT));
}

export function clearPendingPoints(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(pendingKey(projectId));
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(PENDING_EVENT));
}

export function subscribePending(
  projectId: string,
  cb: (items: PendingPoint[]) => void
): () => void {
  const onChange = () => cb(loadPendingPoints(projectId));
  window.addEventListener(PENDING_EVENT, onChange);
  return () => window.removeEventListener(PENDING_EVENT, onChange);
}
