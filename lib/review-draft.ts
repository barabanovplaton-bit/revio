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
