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

export interface ProjectPackage {
  round: number;
  imageUrls: string[];
  createdAt: Timestamp | null;
}

export interface Project {
  id: string;
  ownerUid: string;
  name: string;
  description: string;
  clientName: string;
  clientContact: string;
  /** Текущий пакет картинок (Cloudinary) */
  imageUrls: string[];
  /** История пакетов (старые загрузки) */
  packageHistory: ProjectPackage[];
  /** Текущий круг правок */
  currentRound: number;
  /** Лимит кругов правок */
  roundsTotal: number;
  roundsLeft: number;
  /** Сколько дополнительных кругов добавлено */
  extraRoundsAdded: number;
  /** Текст при исчерпании лимита */
  limitMessage: string;
  /** Заблокирован ли проект (клиент отправил правки) */
  isLocked: boolean;
  /** Клиент отправил правки текущего раунда (нажал «Готово») */
  clientSubmitted?: boolean;
  /** Фрилансер открыл раунд с новыми правками (красные точки прочитаны) */
  clientSubmittedRead?: boolean;
  /** Закреплённый проект */
  pinned: boolean;
  /** Скрыт (мягкое удаление: проект остаётся в базе, лимит не освобождается) */
  deleted?: boolean;
  /** Статус проекта */
  status: "waiting_for_images" | "in_progress" | "exhausted";
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

const COLLECTION = "projects";

/** Создать проект. Возвращает id нового проекта. */
export async function createProject(
  data:   Omit<
    Project,
    "id" | "ownerUid" | "imageUrls" | "packageHistory" | "currentRound" | "extraRoundsAdded" | "isLocked" | "pinned" | "deleted" | "createdAt" | "updatedAt"
  > & { status?: Project["status"] },
  ownerUid: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ownerUid,
    name: data.name,
    description: data.description,
    clientName: data.clientName || "",
    clientContact: data.clientContact || "",
    imageUrls: [],
    packageHistory: [],
    currentRound: 1,
    roundsTotal: data.roundsTotal,
    roundsLeft: data.roundsTotal,
    extraRoundsAdded: 0,
    limitMessage: data.limitMessage,
    isLocked: false,
    pinned: false,
    status: data.status || "waiting_for_images",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Получить проект по id (one-time read). */
export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<Project, "id">) };
}

/** Подписка на один проект (realtime). */
export function subscribeToProject(
  id: string,
  cb: (project: Project | null) => void
): () => void {
  return onSnapshot(
    doc(db, COLLECTION, id),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      cb({ id: snap.id, ...(snap.data() as Omit<Project, "id">) });
    },
    (err) => {
      console.error("subscribeToProject error:", err);
    }
  );
}

/** Подписка на все проекты пользователя.
 *  Сортировка: pinned сначала, потом по updatedAt desc. */
export function subscribeToUserProjects(
  ownerUid: string,
  cb: (projects: Project[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where("ownerUid", "==", ownerUid)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: Project[] = [];
      snap.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as Omit<Project, "id">) });
      });
      // Сортируем локально
      list.sort((a, b) => {
        // Закреплённые в начало
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        // По updatedAt desc
        const aTime = a.updatedAt?.toMillis() || 0;
        const bTime = b.updatedAt?.toMillis() || 0;
        return bTime - aTime;
      });
      cb(list);
    },
    (err) => {
      console.error("subscribeToUserProjects error:", err);
    }
  );
}

/** Обновить поля проекта. */
export async function updateProject(
  id: string,
  data: Partial<Project>
): Promise<void> {
  const { id: _omit, ...rest } = data;
  await updateDoc(doc(db, COLLECTION, id), {
    ...rest,
    updatedAt: serverTimestamp(),
  });
}

/** Закрепить/открепить проект. */
export async function togglePin(id: string, pinned: boolean): Promise<void> {
  await updateProject(id, { pinned });
}

/**
 * Удалить проект (мягкое удаление).
 * Документ остаётся в базе с флагом `deleted` — слот лимита НЕ освобождается.
 */
export async function deleteProject(id: string): Promise<void> {
  await updateProject(id, { deleted: true, pinned: false });
}

/**
 * Удалить проект НАВСЕГДА (без восстановления).
 * Сначала удаляется документ проекта (мгновенно исчезает из интерфейса),
 * затем фоновые данные: маркеры и уведомления.
 */
export async function deleteProjectPermanently(id: string): Promise<void> {
  const { deleteAllProjectMarkers } = await import("./markers");

  // Сам проект — первым делом
  await deleteDoc(doc(db, COLLECTION, id));

  // Маркеры проекта (все раунды)
  await deleteAllProjectMarkers(id);

  // Уведомления проекта
  const notifQ = query(
    collection(db, "notifications"),
    where("projectId", "==", id)
  );
  const notifSnap = await getDocs(notifQ);
  await Promise.all(
    notifSnap.docs.map((d) => deleteDoc(doc(db, "notifications", d.id)))
  );
}

/** Обновить картинки проекта */
export async function updateProjectImages(
  id: string,
  imageUrls: string[]
): Promise<void> {
  await updateProject(id, { imageUrls });
}

/** Добавить дополнительные раунды правок. maxTotal — верхний предел суммарного числа раундов (для Free). */
export async function addExtraRounds(
  id: string,
  count: number,
  maxTotal?: number
): Promise<void> {
  const project = await getProject(id);
  if (!project) return;

  const total = project.roundsTotal || 0;
  let added = count;
  if (maxTotal != null && total + added > maxTotal) {
    added = Math.max(0, maxTotal - total);
  }
  if (added <= 0) return;

  await updateProject(id, {
    roundsTotal: total + added,
    roundsLeft: (project.roundsLeft || 0) + added,
    extraRoundsAdded: (project.extraRoundsAdded || 0) + added,
    isLocked: false,
    status: "in_progress",
  });
}

/**
 * Загрузить новый пакет: текущие картинки уходят в историю, новые становятся актуальными
 */
export async function uploadNewPackage(
  id: string,
  newImageUrls: string[],
  currentRound: number
): Promise<void> {
  const project = await getProject(id);
  if (!project) return;

  const history = project.packageHistory || [];
  // Сохраняем текущий пакет в историю (если есть картинки)
  if (project.imageUrls && project.imageUrls.length > 0) {
    history.push({
      round: currentRound,
      imageUrls: project.imageUrls,
      createdAt: project.updatedAt,
    });
  }

  await updateProject(id, {
    imageUrls: newImageUrls,
    packageHistory: history,
  });
}

/**
 * Начать новый раунд правок: текущий пакет и его правки сохраняются в истории,
 * новый пакет становится актуальным, счётчик доступных раундов уменьшается.
 */
export async function startNewRound(
  id: string,
  newImageUrls: string[]
): Promise<void> {
  const project = await getProject(id);
  if (!project) return;

  const current = project.currentRound || 1;
  const history = project.packageHistory || [];
  if (project.imageUrls && project.imageUrls.length > 0) {
    history.push({
      round: current,
      imageUrls: project.imageUrls,
      createdAt: project.updatedAt,
    });
  }

  await updateProject(id, {
    imageUrls: newImageUrls,
    packageHistory: history,
    currentRound: current + 1,
    isLocked: false,
    clientSubmitted: false,
    status: "in_progress",
  });
}

/** Доступны ли ещё раунды правок */
export function hasRoundsLeft(project: Project): boolean {
  return (project.roundsLeft ?? 0) > 0;
}

/** Максимум суммарных раундов по тарифу (Free — 5, Pro — без ограничения) */
export function getMaxRoundsForPlan(plan: "free" | "pro"): number {
  return plan === "pro" ? Infinity : 5;
}

/** Можно ли докупить ещё раунд по тарифу */
export function canAddRounds(
  project: Project,
  maxTotal: number
): boolean {
  return maxTotal === Infinity || (project.roundsTotal || 0) < maxTotal;
}

/** Форматирование относительного времени. */
export function formatRelativeTime(ts: Timestamp | null): string {
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
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} нед назад`;
  const months = Math.floor(days / 30);
  return `${months} мес назад`;
}
