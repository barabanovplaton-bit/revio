"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  getProject,
  updateProject,
  togglePin,
  toggleArchive,
  deleteProject,
  PROJECT_STATUS_LABEL,
  type Project,
  type ProjectModule,
} from "@/lib/projects";

interface ProjectHubProps {
  projectId: string;
  ownerUid: string;
  onBack: () => void;
  onProjectDeleted: () => void;
  onProjectUpdated: () => void;
}

const MODULES: { id: ProjectModule; label: string }[] = [
  { id: "brief", label: "Бриф" },
  { id: "revisions", label: "Правки" },
  { id: "checklist", label: "Чек-лист" },
];

export function ProjectHub({
  projectId,
  ownerUid,
  onBack,
  onProjectDeleted,
  onProjectUpdated,
}: ProjectHubProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"main" | ProjectModule>("main");
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getProject(projectId);
      if (cancelled) return;
      setProject(p);
      if (p) setActiveTab(p.activeModule);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleSelectTab = async (tab: "main" | ProjectModule) => {
    setActiveTab(tab);
    if (tab !== "main" && project) {
      await updateProject(projectId, { activeModule: tab });
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Удалить проект «${project?.name}» навсегда? Все данные будут потеряны.`
      )
    )
      return;
    await deleteProject(projectId);
    onProjectDeleted();
  };

  const handleArchive = async () => {
    if (!project) return;
    await toggleArchive(projectId, !project.archived);
    onProjectUpdated();
    onBack();
  };

  const handlePin = async () => {
    if (!project) return;
    await togglePin(projectId, !project.pinned);
    onProjectUpdated();
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-text-muted">Проект не найден</p>
        <button
          onClick={onBack}
          className="rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page"
        >
          ← Назад к проектам
        </button>
      </div>
    );
  }

  // Ссылка для клиента (пока заглушка — будет реальная после деплоя)
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/review/${projectId}`
      : `/review/${projectId}`;

  return (
    <div className="flex h-full flex-col">
      {/* Шапка проекта */}
      <header className="shrink-0 border-b bg-bg-sidebar px-4 py-3 md:px-6">
        <div className="flex items-center justify-between gap-3">
          {/* Левая часть: назад + иконка + название + статус */}
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              aria-label="Назад"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-bg-input text-lg">
              {project.icon || "📁"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-display text-lg font-semibold text-text-primary">
                {project.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor:
                      project.status === "brief"
                        ? "#9CA3AF"
                        : project.status === "revisions"
                          ? "#FFFFFF"
                          : project.status === "checklist"
                            ? "#6B6B6B"
                            : "#3A3A3A",
                  }}
                />
                {PROJECT_STATUS_LABEL[project.status]}
              </div>
            </div>
          </div>

          {/* Правая часть: действия */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => setShowShare(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover active:scale-[0.98]"
            >
              <ShareIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Поделиться</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              aria-label="Настройки проекта"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Табы */}
        <div className="mt-3 flex gap-1">
          <TabButton
            active={activeTab === "main"}
            onClick={() => setActiveTab("main")}
          >
            Главное
          </TabButton>
          {MODULES.map((m) => (
            <TabButton
              key={m.id}
              active={activeTab === m.id}
              onClick={() => handleSelectTab(m.id)}
            >
              {m.label}
            </TabButton>
          ))}
        </div>
      </header>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === "main" && (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10"
            >
              <MainTab
                project={project}
                shareUrl={shareUrl}
                onShare={() => setShowShare(true)}
              />
            </motion.div>
          )}
          {activeTab === "brief" && (
            <motion.div
              key="brief"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full items-center justify-center px-4 py-10"
            >
              <Placeholder
                icon="📝"
                title="Бриф"
                description="Модуль будет добавлен на следующем шаге"
              />
            </motion.div>
          )}
          {activeTab === "revisions" && (
            <motion.div
              key="revisions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full items-center justify-center px-4 py-10"
            >
              <Placeholder
                icon="📍"
                title="Правки"
                description="Модуль будет добавлен на следующем шаге"
              />
            </motion.div>
          )}
          {activeTab === "checklist" && (
            <motion.div
              key="checklist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex h-full items-center justify-center px-4 py-10"
            >
              <Placeholder
                icon="✅"
                title="Чек-лист сдачи"
                description="Модуль будет добавлен на следующем шаге"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Модалка Поделиться */}
      {showShare && (
        <ShareModal url={shareUrl} onClose={() => setShowShare(false)} />
      )}

      {/* Модалка Настройки */}
      {showSettings && project && (
        <SettingsModal
          project={project}
          onClose={() => setShowSettings(false)}
          onPin={handlePin}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

/* ===== Главная вкладка ===== */

function MainTab({
  project,
  shareUrl,
  onShare,
}: {
  project: Project;
  shareUrl: string;
  onShare: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Карточка ссылки */}
      <div className="rounded-2xl border bg-bg-card p-5">
        <h3 className="mb-2 text-sm font-medium text-text-primary">
          Ссылка для клиента
        </h3>
        <p className="mb-4 text-xs text-text-muted">
          Отправьте эту ссылку заказчику. Он пройдёт по ней и заполнит{" "}
          {project.activeModule === "brief"
            ? "бриф"
            : project.activeModule === "revisions"
              ? "правки"
              : "чек-лист"}
          . Без регистрации.
        </p>
        <div className="flex items-center gap-2 rounded-xl border bg-bg-input p-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-text-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl);
            }}
            className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-opacity hover:opacity-90"
          >
            Копировать
          </button>
        </div>
        <button
          type="button"
          onClick={onShare}
          className="mt-3 text-xs text-text-muted underline transition-colors hover:text-text-primary"
        >
          Открыть QR-код и доп. опции →
        </button>
      </div>

      {/* Информация о проекте */}
      <div className="rounded-2xl border bg-bg-card p-5">
        <h3 className="mb-3 text-sm font-medium text-text-primary">
          Информация
        </h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Тип проекта</dt>
            <dd className="text-text-primary">
              {project.type
                ? project.type === "image"
                  ? "Изображение / Макет"
                  : project.type === "video"
                    ? "Видеоролик"
                    : "Живой сайт"
                : "Не выбран"}
            </dd>
          </div>
          {project.description && (
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-text-muted">Описание</dt>
              <dd className="text-right text-text-primary">
                {project.description}
              </dd>
            </div>
          )}
          {project.clientName && (
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Заказчик</dt>
              <dd className="text-text-primary">{project.clientName}</dd>
            </div>
          )}
          {project.clientContact && (
            <div className="flex justify-between gap-4">
              <dt className="text-text-muted">Контакт</dt>
              <dd className="text-text-primary">{project.clientContact}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <dt className="text-text-muted">Круги правок</dt>
            <dd className="text-text-primary">
              {project.roundsLeft} из {project.roundsTotal} осталось
            </dd>
          </div>
        </dl>
      </div>

      {/* Активность */}
      <div className="rounded-2xl border bg-bg-card p-5">
        <h3 className="mb-3 text-sm font-medium text-text-primary">Активность</h3>
        <div className="py-6 text-center text-xs text-text-muted">
          Пока тихо. Когда клиент пройдёт по ссылке — здесь появятся события.
        </div>
      </div>
    </div>
  );
}

/* ===== Заглушка для будущих модулей ===== */

function Placeholder({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-sm text-center">
      <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border bg-bg-card text-3xl">
        {icon}
      </div>
      <h2 className="mb-1 font-display text-xl font-semibold text-text-primary">
        {title}
      </h2>
      <p className="text-sm text-text-muted">{description}</p>
    </div>
  );
}

/* ===== Tab Button ===== */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "text-text-primary"
          : "text-text-muted hover:text-text-primary"
      )}
    >
      {children}
      {active && (
        <motion.div
          layoutId="activeTab"
          className="absolute inset-0 -z-10 rounded-lg bg-bg-card"
          transition={{ duration: 0.2 }}
        />
      )}
    </button>
  );
}

/* ===== Модалка Поделиться ===== */

function ShareModal({ url, onClose }: { url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm animate-slide-up rounded-3xl border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-lg font-medium text-text-primary">
          Поделиться проектом
        </h2>
        <p className="mb-4 text-sm text-text-muted">
          Отправьте эту ссылку клиенту в Telegram или WhatsApp
        </p>
        <div className="mb-4 flex items-center gap-2 rounded-xl border bg-bg-input p-2">
          <input
            type="text"
            value={url}
            readOnly
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-text-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-opacity hover:opacity-90"
          >
            {copied ? "✓ Скопировано" : "Копировать"}
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-border-strong bg-bg-input py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-cardHover"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

/* ===== Модалка Настройки проекта ===== */

function SettingsModal({
  project,
  onClose,
  onPin,
  onArchive,
  onDelete,
}: {
  project: Project;
  onClose: () => void;
  onPin: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm animate-slide-up rounded-3xl border bg-bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-medium text-text-primary">
          Настройки проекта
        </h2>

        <div className="space-y-1">
          <button
            type="button"
            onClick={onPin}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
          >
            <PinIcon className="h-4 w-4 text-text-muted" />
            {project.pinned ? "Открепить" : "Закрепить"}
          </button>
          <button
            type="button"
            onClick={onArchive}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-text-primary transition-colors hover:bg-bg-cardHover"
          >
            <ArchiveIcon className="h-4 w-4 text-text-muted" />
            {project.archived ? "Восстановить из архива" : "В архив"}
          </button>
          <div className="my-2 h-px bg-border" />
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            <TrashIcon className="h-4 w-4" />
            Удалить проект
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full rounded-xl border border-border-strong bg-bg-input py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-cardHover"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

/* ===== Иконки ===== */

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
      <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 17v5M5 12V7l4-4h6l4 4v5l-7 5z" />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
