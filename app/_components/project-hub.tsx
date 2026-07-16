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
  updateProjectImages,
  type Project,
} from "@/lib/projects";
import { ImageUploader, UploadedImage } from "./image-uploader";
import { type UploadResult } from "@/lib/cloudinary";

interface ProjectHubProps {
  projectId: string;
  ownerUid: string;
  onBack: () => void;
  onProjectDeleted: () => void;
  onProjectUpdated: () => void;
}

export function ProjectHub({
  projectId,
  ownerUid,
  onBack,
  onProjectDeleted,
  onProjectUpdated,
}: ProjectHubProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getProject(projectId);
      if (cancelled) return;
      setProject(p);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

  const handleUpload = (result: UploadResult) => {
    setNewImages((prev) => [...prev, result.url]);
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadNewVersion = async () => {
    if (!project || newImages.length === 0) return;
    setIsUploading(true);
    try {
      await updateProjectImages(projectId, newImages);
      await updateProject(projectId, {
        currentRound: project.currentRound + 1,
        isLocked: false,
      });
      setNewImages([]);
      setShowUpload(false);
      const updated = await getProject(projectId);
      setProject(updated);
      onProjectUpdated();
    } catch (error) {
      console.error("Failed to upload new version:", error);
    } finally {
      setIsUploading(false);
    }
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
                    backgroundColor: project.isLocked ? "#F59E0B" : "#3B82F6",
                  }}
                />
                {project.isLocked ? "Ожидает правок" : "Активен"}
                <span>•</span>
                <span>Круг {project.currentRound}/{project.roundsTotal}</span>
                <span>•</span>
                <span>Осталось {project.roundsLeft}</span>
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
      </header>

      {/* Контент */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-10">
          {/* Статус и действия */}
          <div className="mb-6 rounded-xl border border-border-strong bg-bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium text-text-primary">Статус проекта</h3>
                <p className="text-sm text-text-muted">
                  {project.isLocked
                    ? "Ожидает новую версию (клиент отправил правки)"
                    : "Активен - клиент может оставлять правки"}
                </p>
              </div>
              {project.isLocked && (
                <button
                  type="button"
                  onClick={() => setShowUpload(true)}
                  className="rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90"
                >
                  Загрузить новую версию
                </button>
              )}
            </div>
          </div>

          {/* Картинки */}
          <div className="mb-6">
            <h3 className="mb-3 font-medium text-text-primary">Загруженные изображения</h3>
            {project.imageUrls && project.imageUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {project.imageUrls.map((url, index) => (
                  <div key={index} className="aspect-square overflow-hidden rounded-xl border border-border-strong bg-bg-input">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Нет загруженных изображений</p>
            )}
          </div>

          {/* Информация */}
          <div className="rounded-xl border border-border-strong bg-bg-card p-4">
            <h3 className="mb-3 font-medium text-text-primary">Информация</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-muted">Лимит кругов:</span>
                <span className="text-text-primary">{project.roundsTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Осталось:</span>
                <span className="text-text-primary">{project.roundsLeft}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Текущий круг:</span>
                <span className="text-text-primary">{project.currentRound}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Модалка загрузки новой версии */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-border-strong rounded-2xl p-6 max-w-lg w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Загрузить новую версию
              </h2>
              <p className="mb-4 text-sm text-text-muted">
                После загрузки текущий круг завершится и клиент сможет снова оставлять правки.
              </p>
              <div className="space-y-4">
                <ImageUploader
                  onUpload={handleUpload}
                  disabled={isUploading}
                  maxSize={5}
                />
                {newImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {newImages.map((url, index) => (
                      <UploadedImage
                        key={index}
                        url={url}
                        onRemove={() => handleRemoveNewImage(index)}
                        canRemove={!isUploading}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUpload(false)}
                  disabled={isUploading}
                  className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleUploadNewVersion}
                  disabled={newImages.length === 0 || isUploading}
                  className="rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {isUploading ? "Загрузка..." : "Загрузить"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модалка настроек */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-border-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Настройки проекта
              </h2>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handlePin}
                  className="w-full rounded-lg border border-border-strong px-4 py-3 text-left text-sm text-text-primary transition-all hover:bg-bg-cardHover"
                >
                  {project.pinned ? "Открепить" : "Закрепить"}
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  className="w-full rounded-lg border border-border-strong px-4 py-3 text-left text-sm text-text-primary transition-all hover:bg-bg-cardHover"
                >
                  {project.archived ? "Разархивировать" : "Архивировать"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-left text-sm text-red-500 transition-all hover:bg-red-500/20"
                >
                  Удалить проект
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="mt-4 w-full rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
              >
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модалка "Поделиться" */}
      <AnimatePresence>
        {showShare && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowShare(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bg-card border border-border-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                Поделиться проектом
              </h2>
              <p className="mb-4 text-sm text-text-muted">
                Отправьте эту ссылку клиенту для сбора правок
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-border-strong bg-bg-input px-3 py-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-transparent text-sm text-text-primary outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                  }}
                  className="rounded-lg bg-text-primary px-3 py-1 text-xs font-medium text-bg-page transition-all hover:opacity-90"
                >
                  Копировать
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowShare(false)}
                className="mt-4 w-full rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
              >
                Закрыть
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}