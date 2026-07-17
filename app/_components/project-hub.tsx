"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ProjectIcon, getIconIndex } from "@/lib/project-icons";

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
  const [showUpload, setShowUpload] = useState(false);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Редактирование полей
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

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
    const updated = await getProject(projectId);
    setProject(updated);
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
        status: "in_progress",
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

  const handleSaveField = async (field: string) => {
    if (!project) return;
    const data: Partial<Project> = {};
    if (field === "name") data.name = editValue.trim() || project.name;
    if (field === "description") data.description = editValue.trim();
    if (field === "clientName") data.clientName = editValue.trim();
    if (field === "clientContact") data.clientContact = editValue.trim();
    await updateProject(projectId, data);
    const updated = await getProject(projectId);
    setProject(updated);
    setEditingField(null);
  };

  const startEdit = (field: string, value: string) => {
    setEditValue(value);
    setEditingField(field);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-bg-page">
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

  const statusConfig = {
    waiting_for_images: { text: "Ожидает загрузки", color: "bg-yellow-500/20 text-yellow-400" },
    in_progress: { text: "Активен", color: "bg-green-500/20 text-green-400" },
    exhausted: { text: "Раунды закончились", color: "bg-red-500/20 text-red-400" },
  };
  const status = statusConfig[project.status || "waiting_for_images"];

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      {/* Простая шапка: стрелка + название + меню */}
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-4 py-3 shadow-lg">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
            aria-label="Назад"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <ProjectIcon
                index={project.iconIndex ?? getIconIndex(project.icon)}
                color={project.iconColor || "#E880FC"}
                className="h-5 w-5 shrink-0"
              />
              <h1 className="truncate text-sm font-semibold text-text-primary">
                {project.name}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              aria-label="Копировать ссылку"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16,6 12,2 8,6" />
                <line x1="12" y1="2" x2="12" y2="15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handlePin}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              aria-label={project.pinned ? "Открепить" : "Закрепить"}
            >
              <svg viewBox="0 0 24 24" fill={project.pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M12 17v5" />
                <path d="M9 11V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7" />
                <path d="M5 11h14l-1.5 6H6.5L5 11z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className="rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              aria-label="Настройки"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>
        </header>
      </div>

      {/* Контент */}
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
        {/* Ссылка для клиента — всегда видна */}
        <div className="mb-4 rounded-xl border border-border-strong bg-bg-card p-3">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-text-muted">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16,6 12,2 8,6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 bg-transparent text-xs text-text-muted outline-none"
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Копировать
            </button>
          </div>
        </div>

        {/* Статус */}
        <div className="mb-4 flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
            {status.text}
          </span>
          <span className="text-xs text-text-muted">
            Круг {project.currentRound}/{project.roundsTotal}
          </span>
          {project.clientName && (
            <>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{project.clientName}</span>
            </>
          )}
        </div>

        {/* Настройки — раскрывающийся блок */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mb-4 space-y-3 rounded-xl border border-border-strong bg-bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  Настройки проекта
                </p>

                {/* Имя */}
                <FieldRow
                  label="Название"
                  value={project.name}
                  editing={editingField === "name"}
                  onEdit={() => startEdit("name", project.name)}
                  editValue={editValue}
                  onEditValueChange={setEditValue}
                  onSave={() => handleSaveField("name")}
                  onCancel={() => setEditingField(null)}
                />

                {/* Описание */}
                <FieldRow
                  label="Описание"
                  value={project.description || "Не указано"}
                  editing={editingField === "description"}
                  onEdit={() => startEdit("description", project.description)}
                  editValue={editValue}
                  onEditValueChange={setEditValue}
                  onSave={() => handleSaveField("description")}
                  onCancel={() => setEditingField(null)}
                />

                {/* Имя клиента */}
                <FieldRow
                  label="Клиент"
                  value={project.clientName || "Не указано"}
                  editing={editingField === "clientName"}
                  onEdit={() => startEdit("clientName", project.clientName)}
                  editValue={editValue}
                  onEditValueChange={setEditValue}
                  onSave={() => handleSaveField("clientName")}
                  onCancel={() => setEditingField(null)}
                />

                {/* Контакт */}
                <FieldRow
                  label="Контакт"
                  value={project.clientContact || "Не указано"}
                  editing={editingField === "clientContact"}
                  onEdit={() => startEdit("clientContact", project.clientContact)}
                  editValue={editValue}
                  onEditValueChange={setEditValue}
                  onSave={() => handleSaveField("clientContact")}
                  onCancel={() => setEditingField(null)}
                />

                {/* Действия */}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleArchive}
                    className="flex-1 rounded-lg border border-border-strong px-3 py-2 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover"
                  >
                    {project.archived ? "Восстановить" : "Архив"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition-all hover:bg-red-500/20"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Картинки */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              Изображения
            </h3>
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border-strong bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover active:scale-[0.98]"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Добавить
            </button>
          </div>
          {project.imageUrls && project.imageUrls.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {project.imageUrls.map((url, index) => (
                <div
                  key={index}
                  className="aspect-square overflow-hidden rounded-xl border border-border-strong bg-bg-input"
                >
                  <img
                    src={url}
                    alt={`Image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border-strong bg-bg-input/40 py-12 text-center">
              <p className="mb-2 text-sm text-text-muted">
                Нет загруженных изображений
              </p>
              <p className="text-xs text-text-muted">
                Загрузите макеты для сбора правок
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Модалка загрузки */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowUpload(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-2 text-lg font-semibold text-text-primary">
                Загрузить изображения
              </h2>
              <p className="mb-4 text-sm text-text-muted">
                Макеты для правок (макс. 5MB)
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
    </div>
  );
}

/* ===== Компонент строки настроек ===== */
function FieldRow({
  label,
  value,
  editing,
  onEdit,
  editValue,
  onEditValueChange,
  onSave,
  onCancel,
}: {
  label: string;
  value: string;
  editing: boolean;
  onEdit: () => void;
  editValue: string;
  onEditValueChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-text-muted">
          {label}
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => onEditValueChange(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
            className="min-h-0 flex-1 rounded-lg border border-border-strong bg-bg-input px-3 py-1.5 text-xs text-text-primary focus:border-text-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={onSave}
            className="rounded-lg bg-text-primary px-2.5 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1">
        <span className="block text-[10px] font-medium uppercase tracking-wide text-text-muted">
          {label}
        </span>
        <span className="block truncate text-xs text-text-primary">
          {value}
        </span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
          <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    </div>
  );
}
