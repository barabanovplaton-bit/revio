"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProject,
  updateProject,
  uploadNewPackage,
  type Project,
} from "@/lib/projects";
import {
  subscribeToAllProjectMarkers,
  type Marker,
} from "@/lib/markers";
import { ConfirmModal } from "./confirm-modal";
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
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [confirmUpload, setConfirmUpload] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image viewer
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);

  // Feedback packets
  const [selectedPacket, setSelectedPacket] = useState<number | null>(null);

  // Fullscreen preview
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const refreshProject = useCallback(async () => {
    const p = await getProject(projectId);
    setProject(p);
    onProjectUpdated();
  }, [projectId, onProjectUpdated]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await getProject(projectId);
      if (cancelled) return;
      setProject(p);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  useEffect(() => {
    const unsub = subscribeToAllProjectMarkers(projectId, (m) => setMarkers(m));
    return () => unsub();
  }, [projectId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // --- File handling ---
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024
    );
    if (valid.length === 0) {
      showToast("Только изображения до 10 МБ");
      return;
    }
    const urls = valid.map((f) => URL.createObjectURL(f));
    setPendingFiles((prev) => [...prev, ...valid]);
    setPreviewUrls((prev) => [...prev, ...urls]);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const movePreview = (from: number, to: number) => {
    if (to < 0 || to >= pendingFiles.length) return;
    const newFiles = [...pendingFiles];
    const newUrls = [...previewUrls];
    const [f] = newFiles.splice(from, 1);
    const [u] = newUrls.splice(from, 1);
    newFiles.splice(to, 0, f);
    newUrls.splice(to, 0, u);
    setPendingFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  // --- Upload ---
  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0 || !project) return;
    setConfirmUpload(false);
    setIsUploading(true);

    const uploaded: string[] = [];
    for (const file of pendingFiles) {
      try {
        const result = await uploadImage(file);
        uploaded.push(result.url);
      } catch (e) {
        console.error("Upload error:", e);
      }
    }

    if (uploaded.length > 0) {
      const isFirstUpload = !project.imageUrls || project.imageUrls.length === 0;
      if (isFirstUpload) {
        await updateProject(projectId, {
          imageUrls: uploaded,
          status: "in_progress",
        });
        setProject({
          ...project,
          imageUrls: uploaded,
          status: "in_progress",
        });
      } else {
        await updateProject(projectId, {
          imageUrls: uploaded,
          status: "in_progress",
        });
        setProject({
          ...project,
          imageUrls: uploaded,
          status: "in_progress",
        });
      }
      showToast("Пакет загружен (" + uploaded.length + " изображений)");
    }

    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPendingFiles([]);
    setPreviewUrls([]);
    setIsUploading(false);
  };

  const handleCancelUpload = () => {
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setPendingFiles([]);
    setPreviewUrls([]);
    setConfirmUpload(false);
  };

  // --- Next round ---
  const handleStartNextRound = async () => {
    if (!project) return;
    await updateProject(projectId, {
      isLocked: false,
      currentRound: project.currentRound + 1,
    });
    await refreshProject();
    showToast(`Круг ${project.currentRound + 1} начат`);
  };

  // --- Loading/Error ---
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
        <button onClick={onBack} className="rounded-xl bg-text-primary px-4 py-2 text-sm font-medium text-bg-page">
          Назад к проектам
        </button>
      </div>
    );
  }

  const imageCount = project.imageUrls?.length || 0;
  const hasImages = imageCount > 0;
  const hasPending = pendingFiles.length > 0;

  // Feedback packets
  const packets: { round: number; markers: Marker[] }[] = [];
  if (hasImages) {
    const roundMap = new Map<number, Marker[]>();
    for (const m of markers) {
      const existing = roundMap.get(m.round) || [];
      existing.push(m);
      roundMap.set(m.round, existing);
    }
    const rounds = Array.from(roundMap.keys()).sort((a, b) => b - a);
    for (const r of rounds) {
      packets.push({ round: r, markers: roundMap.get(r)! });
    }
  }

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/review/${projectId}`
      : `/review/${projectId}`;

  // --- Fullscreen preview ---
  if (fullscreenIndex !== null) {
    const allUrls = hasPending ? previewUrls : (project.imageUrls || []);
    const url = allUrls[fullscreenIndex];
    if (url) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setFullscreenIndex(null)}
              className="rounded-lg p-2 text-white/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm text-white/70">
              {fullscreenIndex + 1} / {allUrls.length}
            </span>
            <div className="w-9" />
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            <img src={url} alt="" className="max-h-full max-w-full object-contain" />
          </div>
        </div>
      );
    }
  }

  // --- Image viewer mode (with markers) ---
  if (viewingImageIndex !== null && project.imageUrls?.[viewingImageIndex]) {
    return (
      <div className="flex h-screen flex-col bg-bg-page">
        <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
          <header className="mx-auto flex max-w-4xl items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-4 py-3 shadow-lg">
            <button type="button" onClick={() => setViewingImageIndex(null)} className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
              </svg>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-semibold text-text-primary">
                {project.name} — {viewingImageIndex + 1} / {imageCount}
              </h1>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewingImageIndex(Math.max(0, viewingImageIndex - 1))} disabled={viewingImageIndex === 0} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-cardHover disabled:opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button onClick={() => setViewingImageIndex(Math.min(imageCount - 1, viewingImageIndex + 1))} disabled={viewingImageIndex === imageCount - 1} className="rounded-lg p-1.5 text-text-muted hover:bg-bg-cardHover disabled:opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </div>
          </header>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <div className="mx-auto max-w-4xl">
            <div className="relative inline-block w-full">
              <img src={project.imageUrls[viewingImageIndex]} alt="" className="w-full rounded-xl border border-border-strong" />
              {markers
                .filter((m) => m.type === "point" && m.round === project.currentRound && m.x != null && m.y != null)
                .map((marker) => {
                  const total = imageCount;
                  const cols = total <= 3 ? total : 3;
                  const rows = Math.ceil(total / cols);
                  const imgRow = Math.floor(viewingImageIndex / cols);
                  const imgCol = viewingImageIndex % cols;
                  const minX = imgCol / cols;
                  const maxX = (imgCol + 1) / cols;
                  const minY = imgRow / rows;
                  const maxY = (imgRow + 1) / rows;
                  if ((marker.x || 0) < minX || (marker.x || 0) >= maxX || (marker.y || 0) < minY || (marker.y || 0) >= maxY) return null;
                  return (
                    <div key={marker.id} className="absolute group" style={{ left: `${(marker.x || 0) * 100}%`, top: `${(marker.y || 0) * 100}%`, transform: "translate(-50%, -50%)" }}>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-text-primary border-2 border-white/80 shadow-lg transition-transform group-hover:scale-125">
                        <span className="text-[10px] font-bold text-bg-page">#</span>
                      </div>
                      <div className="absolute left-8 top-1/2 z-40 -translate-y-1/2 w-64 rounded-xl border border-border-strong bg-bg-card p-3 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <p className="text-sm text-text-primary">{marker.text}</p>
                        <p className="mt-1 text-[10px] text-text-muted">({Math.round((marker.x || 0) * 100)}%, {Math.round((marker.y || 0) * 100)}%)</p>
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

  // === MAIN VIEW ===
  return (
    <div className="flex min-h-screen flex-col bg-bg-page">
      {/* Header */}
      <div className="sticky top-0 z-20 px-4 pt-3 md:px-6">
        <header className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-4 py-3 shadow-lg">
          <button type="button" onClick={onBack} className="shrink-0 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-text-primary">{project.name}</h1>
            {hasImages && (
              <p className="text-xs text-text-muted">
                Круг {project.currentRound}/{project.roundsTotal} ·{' '}
                {project.isLocked
                  ? "Ожидание правок от клиента"
                  : "Клиент отправил правки"}
                {project.extraRoundsAdded > 0 && ` · Доп: +${project.extraRoundsAdded}`}
              </p>
            )}
          </div>
          <button type="button" onClick={() => router.push(`/project/${projectId}/settings`)} className="shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </header>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">

        {/* ===== EMPTY STATE: no images, no pending ===== */}
        {!hasImages && !hasPending && (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center transition-all ${
              isDraggingOver
                ? "border-text-primary bg-text-primary/5"
                : "border-border-strong bg-bg-input/30 hover:border-text-primary/50 hover:bg-bg-input/60"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="mb-4 h-12 w-12 text-text-muted">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="mb-1 text-sm font-medium text-text-primary">Перетащите или нажмите для выбора макетов</p>
            <p className="text-xs text-text-muted">PNG, JPG или WebP до 10 МБ</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
          </div>
        )}

        {/* ===== PENDING FILES: thumbnails grid ===== */}
        {hasPending && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary">
                Новый пакет ({pendingFiles.length})
              </h3>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-strong bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Добавить ещё
                <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
              </label>
            </div>

            <div className="space-y-2">
              {previewUrls.map((url, index) => (
                <div key={index} className="group flex items-center gap-3 rounded-xl border border-border-strong bg-bg-card p-2 transition-all hover:border-text-primary/30">
                  {/* Order number */}
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-bg-page">
                    {index + 1}
                  </div>
                  {/* Thumbnail */}
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-strong bg-bg-input">
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </div>
                  {/* Actions */}
                  <div className="flex flex-1 items-center justify-end gap-1">
                    {/* Move up/down */}
                    <button onClick={(e) => { e.stopPropagation(); movePreview(index, index - 1); }} disabled={index === 0} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-20">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); movePreview(index, index + 1); }} disabled={index === pendingFiles.length - 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-20">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    {/* Fullscreen */}
                    <button onClick={(e) => { e.stopPropagation(); setFullscreenIndex(index); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                    </button>
                    {/* Delete */}
                    <button onClick={(e) => { e.stopPropagation(); removePreview(index); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:text-red-300">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Upload button */}
            <button
              type="button"
              onClick={() => setConfirmUpload(true)}
              className="mt-4 w-full rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Загрузить пакет ({pendingFiles.length} изображений)
            </button>
          </div>
        )}

        {/* ===== HAS IMAGES ===== */}
        {hasImages && !hasPending && (
          <>
            {/* Share link */}
            <div className="mb-4 rounded-xl border border-border-strong bg-bg-card p-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-text-muted">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                  <polyline points="16,6 12,2 8,6" />
                  <line x1="12" y1="2" x2="12" y2="15" />
                </svg>
                <input type="text" readOnly value={shareUrl} className="min-w-0 flex-1 bg-transparent text-xs text-text-muted outline-none" />
                <button type="button" onClick={() => { navigator.clipboard.writeText(shareUrl); showToast("Скопировано"); }} className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]">
                  Копировать
                </button>
              </div>
            </div>

            {/* Status */}
            <div className="mb-4 flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                project.status === "exhausted" ? "bg-red-500/20 text-red-400"
                  : project.isLocked ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-green-500/20 text-green-400"
              }`}>
                {project.status === "exhausted" ? "Все круги использованы"
                  : project.isLocked ? "Клиент отправил правки"
                    : "Активен"}
              </span>
              <span className="text-xs text-text-muted">
                Круг {project.currentRound}/{project.roundsTotal} · Осталось {project.roundsLeft} · {project.extraRoundsAdded > 0 && `Доп: +${project.extraRoundsAdded} · `}Статус: {project.status === "waiting_for_images" ? "Ждём загрузки" : project.isLocked ? "Ожидание от клиента" : project.status === "exhausted" ? "Завершён" : "Ожидание от клиента"}
              </span>
              {project.clientName && (
                <span className="text-xs text-text-muted">· {project.clientName}</span>
              )}
            </div>

            {/* Open холст button (when images present) */}
            {hasImages && (
              <div className="mb-4">
                <button type="button" onClick={() => setViewingImageIndex(0)} className="w-full rounded-xl border border-border-strong bg-bg-card px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover">
                  <span className="flex items-center justify-center gap-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                    Открыть холст
                  </span>
                </button>
              </div>
            )}

            {/* Client submitted — action needed */}
            {project.isLocked && project.roundsLeft > 0 && (
              <div className="mb-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="mb-3 text-sm font-medium text-yellow-400">
                  Клиент отправил правки (круг {project.currentRound})
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-lg bg-text-primary px-4 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90">
                    Загрузить новый пакет
                  </button>
                  <button type="button" onClick={handleStartNextRound} className="rounded-lg border border-border-strong px-4 py-2.5 text-sm text-text-primary transition-all hover:bg-bg-cardHover">
                    Пропустить
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
              </div>
            )}

            {/* Exhausted */}
            {project.status === "exhausted" && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm text-red-400">
                  Все {project.roundsTotal} кругов правок использованы.
                </p>
              </div>
            )}

            {/* Images list (single column) */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-text-primary">
                Изображения ({imageCount})
              </h3>
              <div className="space-y-2">
                {project.imageUrls!.map((url, index) => {
                  const imgMarkers = markers.filter((m) => {
                    if (m.type !== "point" || m.x == null || m.y == null) return false;
                    const total = imageCount;
                    const cols = total <= 3 ? total : 3;
                    const row = Math.floor(index / cols);
                    const col = index % cols;
                    const minX = col / cols;
                    const maxX = (col + 1) / cols;
                    const rows = Math.ceil(total / cols);
                    const minY = row / rows;
                    const maxY = (row + 1) / rows;
                    return m.x >= minX && m.x < maxX && m.y >= minY && m.y < maxY;
                  });
                  return (
                    <div key={index} className="group relative flex items-center gap-3 rounded-xl border border-border-strong bg-bg-card p-2 transition-all hover:border-text-primary/30 cursor-pointer" onClick={() => setViewingImageIndex(index)}>
                      {/* Number */}
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-bg-page">
                        {index + 1}
                      </div>
                      {/* Thumbnail */}
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-strong bg-bg-input">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                      </div>
                      {/* Markers count */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{project.name} — {index + 1}</p>
                        {imgMarkers.length > 0 && (
                          <p className="text-xs text-text-muted">{imgMarkers.length} меток</p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        {/* Fullscreen */}
                        <button onClick={() => setFullscreenIndex(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                        </button>
                        {/* View */}
                        <span className="text-xs font-medium text-text-primary px-2 py-1 rounded-lg bg-bg-input/80">Просмотр</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Package history */}
            {project.packageHistory && project.packageHistory.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-text-primary">
                  Предыдущие пакеты ({project.packageHistory.length})
                </h3>
                <div className="space-y-2">
                  {project.packageHistory.slice().reverse().map((pkg, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl border border-border-strong bg-bg-card px-4 py-3">
                      <div>
                        <span className="text-sm font-medium text-text-primary">Пакет #{pkg.round}</span>
                        <span className="ml-2 text-xs text-text-muted">{pkg.imageUrls.length} изображений</span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {pkg.createdAt?.toDate?.().toLocaleDateString("ru-RU") || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feedback packets */}
            {packets.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-text-primary">
                  Пакеты правок ({packets.length})
                </h3>
                <div className="space-y-2">
                  {packets.map((packet) => (
                    <div key={packet.round} className="rounded-xl border border-border-strong bg-bg-card">
                      <button type="button" onClick={() => setSelectedPacket(selectedPacket === packet.round ? null : packet.round)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                        <div>
                          <span className="text-sm font-medium text-text-primary">Правка #{packet.round}</span>
                          <span className="ml-2 text-xs text-text-muted">
                            {packet.markers.length} {packet.markers.length === 1 ? "метка" : "меток"}
                          </span>
                        </div>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-4 w-4 text-text-muted transition-transform ${selectedPacket === packet.round ? "rotate-180" : ""}`}>
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {selectedPacket === packet.round && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="border-t border-border-strong px-4 py-3 space-y-2">
                              {packet.markers.filter((m) => m.type === "point").map((m) => (
                                <div key={m.id} className="flex items-start gap-3 rounded-lg bg-bg-input/50 p-3">
                                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-bg-page">#</div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-text-primary">{m.text}</p>
                                    <p className="text-[10px] text-text-muted">({Math.round((m.x || 0) * 100)}%, {Math.round((m.y || 0) * 100)}%)</p>
                                  </div>
                                </div>
                              ))}
                              {packet.markers.filter((m) => m.type === "general").map((m) => (
                                <div key={m.id} className="flex items-start gap-3 rounded-lg bg-blue-500/10 p-3">
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="mt-0.5 h-4 w-4 shrink-0 text-blue-400">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                  </svg>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-text-primary">{m.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden file input for "load new package" flow */}
      {!hasImages && !hasPending && (
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
      )}

      {/* Upload confirmation modal */}
      <ConfirmModal
        open={confirmUpload}
        title="Загрузить пакет?"
        message={`Будет загружено ${pendingFiles.length} изображений. После загрузки они станут частью проекта. Для замены — загрузите новый пакет.`}
        confirmLabel="Загрузить"
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />

      {/* Uploading overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-page/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-8 py-6 shadow-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
            <p className="text-sm text-text-primary">Загрузка...</p>
          </div>
        </div>
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }} exit={{ opacity: 0, y: 20, x: "-50%" }} className="fixed bottom-6 left-1/2 z-50 rounded-xl border border-border-strong bg-bg-card px-4 py-2.5 text-sm text-text-primary shadow-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
