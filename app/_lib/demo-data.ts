export type ProjectType = "image" | "video" | "site";
export type ProjectStatus = "brief" | "revisions" | "review" | "done";
export type ProjectModule = "brief" | "revisions" | "checklist";

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: ProjectType;
  status: ProjectStatus;
  activeModule: ProjectModule;
  roundsTotal: number;
  roundsLeft: number;
  updatedAt: number; // timestamp
  archived: boolean;
}

const now = Date.now();
const day = 86400000;

export const DEMO_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Лендинг для кафе",
    description: "Одностраничник для кофейни в Питере",
    type: "image",
    status: "revisions",
    activeModule: "revisions",
    roundsTotal: 3,
    roundsLeft: 2,
    updatedAt: now - 2 * 3600000,
    archived: false,
  },
  {
    id: "p2",
    name: "Карточки WB — Осень",
    description: "5 карточек для осенней коллекции",
    type: "image",
    status: "brief",
    activeModule: "brief",
    roundsTotal: 2,
    roundsLeft: 2,
    updatedAt: now - day,
    archived: false,
  },
  {
    id: "p3",
    name: "Сайт для бара",
    description: "Многостраничник, бронирование столиков",
    type: "site",
    status: "done",
    activeModule: "checklist",
    roundsTotal: 3,
    roundsLeft: 0,
    updatedAt: now - 5 * day,
    archived: true,
  },
  {
    id: "p4",
    name: "Монтаж рилза",
    description: "Короткое видео для соцсетей",
    type: "video",
    status: "revisions",
    activeModule: "revisions",
    roundsTotal: 2,
    roundsLeft: 1,
    updatedAt: now - 3 * day,
    archived: false,
  },
];

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "только что";
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн назад`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} нед назад`;
  const months = Math.floor(days / 30);
  return `${months} мес назад`;
}

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  image: "Изображение",
  video: "Видео",
  site: "Сайт",
};

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  brief: "Бриф",
  revisions: "Правки",
  review: "На сдаче",
  done: "Сдан",
};
