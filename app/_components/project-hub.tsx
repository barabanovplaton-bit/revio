"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProject,
  updateProject,
  updateProjectImages,
  type Project,
} from "@/lib/projects";
import {
  subscribeToProjectMarkers,
  type Marker,
} from "@/lib/markers";
import { ProjectIcon, getIconIndex } from "@/lib/project-icons";
import { uploadImage } from "@/lib/cloudinary";

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
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(
    null
  );
  const [toast, setToast] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<string[]>([]);

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

  useEffect(() => {
    if (!project) return;
    const unsub = subscribeToProjectMarkers(
      projectId,
      project.currentRound,
      (m) => setMarkers(m)
    );
    return () => unsub();
  }, [projectId, project?.currentRound]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) continue;
      try {
        const result = await uploadImage(file);
        setPendingImages((prev) => [...prev, result.url]);
      } catch (e) {
        console.error("Upload error:", e);
      }
    }

    setIsUploading(false);
  };

  const handleRemovePendingImage = (index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveImages = async () => {
    if (!project || pendingImages.length === 0) return;
    setIsUploading(true);
    try {
      const allImages = [...(project.imageUrls || []), ...pendingImages];
      await updateProjectImages(projectId, allImages);
      await updateProject(projectId, {
        status: "in_progress",
        isLocked: false,
      });
      setPendingImages([]);
      const updated = await getProject(projectId);
      setProject(updated);
      onProjectUpdated();
      showToast("Изображения сохранены");
    } catch (error) {
      console.error("Failed to save images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleUnlock = async () => {
    if (!project) return;
    await updateProject(projectId, { isLocked: false });
    const updated = await getProject(projectId);
    setProject(updated);
  };

  const handleMarkReviewed = async () => {
    if (!project) return;
    if (project.roundsLeft > 0) {
      await updateProject(projectId, {
        isLocked: false,
        status: "in_progress",
      });
    } else {
      await updateProject(projectId, {
        isLocked: false,
        status: "exhausted",
      });
    }
    const updated = await getProject(projectId);
    setProject(updated);
    onProjectUpdated();
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
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
          Назад к проектам
        </button>
      </div>
    );
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/review/${projectId}`
      : `/review/${projectId}`;

  const statusConfig = {
    waiting_for_images: {
      text: "Ожидает загрузки",
      color: "bg-yellow-500/20 text-yellow-400",
    },
    in_progress: {
      text: "Активен",
      color: "bg-green-500/20 text-green-400",
    },
    exhausted: {
      text: "Раунды закончились",
      color: "bg-red-500/20 text-red-400",
    },
  };
  const status = statusConfig[project.status || "waiting_for_images"];

  const allImages = [
    ...(project.imageUrls || []),
    ...pendingImages,
  ];

  if (viewingImageIndex !== null && allImages[viewingImageIndex]) {
    return (
      <div className="flex h-screen flex-col bg-bg-page">
        <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
          <header className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-4 py-3 shadow-lg">
            <button
              type="button"
              onClick={() => setViewingImageIndex(null)}
              className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-text-primary">
                {project.name} — {viewingImageIndex + 1}
              </h1>
              <p className="text-xs text-text-muted">
                {markers.filter(
                  (m) =>
                    m.type === "point" &&
                    m.x != null &&
                    m.y != null
                ).length}{" "}
                меток
              </p>
            </div>
          </header>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-4xl">
            <div className="relative inline-block w-full">
              <img
                src={allImages[viewingImageIndex]}
                alt={`Image ${viewingImageIndex + 1}`}
                className="w-full rounded-xl border border-border-strong"
              />
              {markers
                .filter(
                  (m) =>
                    m.type === "point" && m.x != null && m.y != null
                )
                .map((marker) => {
                  const total = allImages.length;
                  const cols = total <= 3 ? total : 3;
                  const rows = Math.ceil(total / cols);
                  const imgRow = Math.floor(viewingImageIndex / cols);
                  const imgCol = viewingImageIndex % cols;
                  const minX = imgCol / cols;
                  const maxX = (imgCol + 1) / cols;
                  const minY = imgRow / rows;
                  const maxY = (imgRow + 1) / rows;
                  if (
                    (marker.x || 0) < minX ||
                    (marker.x || 0) >= maxX ||
                    (marker.y || 0) < minY ||
                    (marker.y || 0) >= maxY
                  )
                    return null;
                  return (
                    <div
                      key={marker.id}
                      className="absolute group"
                      style={{
                        left: `${(marker.x || 0) * 100}%`,
                        top: `${(marker.y || 0) * 100}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-text-primary border-2 border-white/80 shadow-lg transition-transform group-hover:scale-125">
                        <span className="text-[10px] font-bold text-bg-page">
                          #
                        </span>
                      </div>
                      <div className="absolute left-8 top-1/2 z-40 -translate-y-1/2 w-64 rounded-xl border border-border-strong bg-bg-card p-3 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <p className="text-sm text-text-primary">
                          {marker.text}
                        </p>
                        <p className="mt-1 text-[10px] text-text-muted">
                          ({Math.round((marker.x || 0) * 100)}%,{" "}
                          {Math.round((marker.y || 0) * 100)}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-4 py-3 shadow-lg">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
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
          <button
            type="button"
            onClick={() => router.push(`/project/${projectId}/settings`)}
            className="shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">
        {/* Ссылка для клиента */}
        <div className="mb-4 rounded-xl border border-border-strong bg-bg-card p-3">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 shrink-0 text-text-muted"
            >
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
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                showToast("Скопировано");
              }}
              className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Копировать
            </button>
          </div>
        </div>

        {/* Статус */}
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}
          >
            {status.text}
          </span>
          <span className="text-xs text-text-muted">
            Круг {project.currentRound}/{project.roundsTotal}
          </span>
          {project.clientName && (
            <>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">
                {project.clientName}
              </span>
            </>
          )}
          {markers.length > 0 && (
            <>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">
                {markers.length} меток
              </span>
            </>
          )}
        </div>

        {/* Кнопка разблокировки */}
        {project.isLocked && (
          <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="mb-3 text-sm text-yellow-400">
              Клиент отправил правки. Просмотрите метки.
            </p>
            <div className="flex gap-2">
              {project.roundsLeft > 0 && (
                <button
                  type="button"
                  onClick={handleMarkReviewed}
                  className="flex-1 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90"
                >
                  Просмотрено
                </button>
              )}
              <button
                type="button"
                onClick={handleUnlock}
                className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
              >
                Разблокировать
              </button>
            </div>
          </div>
        )}

        {/* Метки клиента */}
        {project.isLocked && markers.length > 0 && (
          <div className="mb-4 rounded-xl border border-border-strong bg-bg-card p-4">
            <h3 className="mb-3 text-sm font-medium text-text-primary">
              Метки клиента
            </h3>
            <div className="space-y-2">
              {markers
                .filter((m) => m.type === "point")
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg bg-bg-input/50 p-3"
                  >
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-bg-page">
                      #
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{m.text}</p>
                      <p className="text-[10px] text-text-muted">
                        ({Math.round((m.x || 0) * 100)}%,{" "}
                        {Math.round((m.y || 0) * 100)}%)
                      </p>
                    </div>
                  </div>
                ))}
              {markers
                .filter((m) => m.type === "general")
                .map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg bg-blue-500/10 p-3"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      className="mt-0.5 h-4 w-4 shrink-0 text-blue-400"
                    >
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{m.text}</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Картинки */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-primary">
              Изображения
            </h3>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-strong bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover active:scale-[0.98]">
              {isUploading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-3.5 w-3.5"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              )}
              {isUploading ? "Загрузка..." : "Добавить"}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileSelect(e.target.files)}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {allImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allImages.map((url, index) => {
                const isPending = index >= (project.imageUrls?.length || 0);
                const imageMarkers = markers.filter((m) => {
                  if (m.type !== "point" || m.x == null || m.y == null)
                    return false;
                  const total = allImages.length;
                  const cols = total <= 3 ? total : 3;
                  const row = Math.floor(index / cols);
                  const col = index % cols;
                  const minX = col / cols;
                  const maxX = (col + 1) / cols;
                  const rows = Math.ceil(total / cols);
                  const minY = row / rows;
                  const maxY = (row + 1) / rows;
                  return (
                    m.x >= minX &&
                    m.x < maxX &&
                    m.y >= minY &&
                    m.y < maxY
                  );
                });
                return (
                  <div
                    key={index}
                    className="group relative aspect-square overflow-hidden rounded-xl border border-border-strong bg-bg-input cursor-pointer transition-all hover:border-text-primary/30"
                    onClick={() => setViewingImageIndex(index)}
                  >
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                    {isPending && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-xs font-medium text-white">
                          Новая
                        </span>
                      </div>
                    )}
                    {imageMarkers.length > 0 && (
                      <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-bg-page shadow-lg">
                        {imageMarkers.length}
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-xs font-medium text-white bg-black/50 rounded-lg px-3 py-1.5">
                        Просмотр
                      </span>
                    </div>
                  </div>
                );
              })}
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

          {pendingImages.length > 0 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleSaveImages}
                disabled={isUploading}
                className="w-full rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {isUploading
                  ? "Сохранение..."
                  : `Сохранить ${pendingImages.length} изображ.`}
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            className="fixed bottom-6 left-1/2 z-50 rounded-xl border border-border-strong bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
