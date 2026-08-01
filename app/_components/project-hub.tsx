"use client";

import { useState, useEffect, useRef, useCallback, Fragment, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProject,
  updateProject,
  deleteProject,
  startNewRound,
  hasRoundsLeft,
  getMaxRoundsForPlan,
  canAddRounds,
  addExtraRounds,
  type Project,
} from "@/lib/projects";
import {
  subscribeToAllProjectMarkers,
  type Marker,
} from "@/lib/markers";
import { getUserProfile } from "@/lib/user-profile";
import { ConfirmModal } from "./confirm-modal";
import { uploadImageWithRetry, prepareImageFile } from "@/lib/cloudinary";

const MAX_IMAGES_PER_PROJECT = 10;

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
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [plan, setPlan] = useState<"free" | "pro">("free");

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ phase: "prepare" | "upload"; done: number; total: number } | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [confirmUpload, setConfirmUpload] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploadErrors, setLastUploadErrors] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rename in header
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");

  // Drag & drop reorder (desktop only; touch uses arrows)
  const [isTouch, setIsTouch] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Image viewer
  const [viewingImageIndex, setViewingImageIndex] = useState<number | null>(null);

  // History viewer (старые раунды)
  const [historyView, setHistoryView] = useState<{
    round: number;
    index: number;
  } | null>(null);

  // Fullscreen preview
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [replaceConfirm, setReplaceConfirm] = useState(false);

  // Canvas (просмотр макетов с маячками текущего раунда)
  const [canvasOpen, setCanvasOpen] = useState(false);
  const [canvasIndex, setCanvasIndex] = useState(0);
  const [canvasShowMarkers, setCanvasShowMarkers] = useState(true);
  const [canvasSelectedMarker, setCanvasSelectedMarker] = useState<string | null>(null);

  useEffect(() => {
    setIsTouch(
      typeof window !== "undefined" &&
        (window.matchMedia("(pointer: coarse)").matches ||
          "ontouchstart" in window)
    );
  }, []);

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
    let cancelled = false;
    (async () => {
      const prof = await getUserProfile(ownerUid);
      if (!cancelled && prof) setPlan(prof.plan);
    })();
    return () => { cancelled = true; };
  }, [ownerUid]);

  // Subscribe to project updates (new comments appear automatically)
  useEffect(() => {
    let cancelled = false;
    const unsub = subscribeToAllProjectMarkers(projectId, (m) => {
      if (!cancelled) setMarkers(m);
    });
    const interval = setInterval(async () => {
      const p = await getProject(projectId);
      if (!cancelled && p) setProject(p);
    }, 5000);
    return () => { cancelled = true; unsub(); clearInterval(interval); };
  }, [projectId]);

  const showToast = (msg: string) => {    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  };

  // --- Rename ---
  const startRename = () => {
    setRenameValue(project?.name || "");
    setRenaming(true);
  };

  const commitRename = async () => {
    const name = renameValue.trim();
    setRenaming(false);
    if (!name || !project || name === project.name) return;
    try {
      await updateProject(projectId, { name });
      const fresh = await getProject(projectId);
      if (fresh) setProject(fresh);
      onProjectUpdated();
      showToast("Переименовано");
    } catch (e) {
      console.error(e);
      showToast("Не удалось переименовать");
    }
  };

  // --- Delete ---
  const handleDelete = async () => {
    setConfirmDelete(false);
    await deleteProject(projectId);
    onProjectDeleted();
  };

  // --- File handling ---
  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const currentCount = project?.imageUrls?.length || 0;
    const replacing = currentCount > 0;

    let valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") && f.size <= 20 * 1024 * 1024
    );
    if (valid.length === 0) {
      showToast("Только изображения до 20 МБ");
      return;
    }

    const base = replacing ? 0 : currentCount;
    const room = MAX_IMAGES_PER_PROJECT - base;
    if (room <= 0) {
      showToast(`Максимум ${MAX_IMAGES_PER_PROJECT} изображений на проект`);
      return;
    }
    if (valid.length > room) {
      valid = valid.slice(0, room);
      showToast(`Максимум ${MAX_IMAGES_PER_PROJECT} изображений на проект`);
    }

    const urls = valid.map((f) => URL.createObjectURL(f));
    setPendingFiles((prev) => [...prev, ...valid]);
    setPreviewUrls((prev) => [...prev, ...urls]);
    setUploadError(null);
  };

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    handleFiles(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

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

  const isDragging = dragIndex !== null && !isTouch;

  // Drop на позицию «перед элементом index» (index === len — в конец списка)
  const handleDropAt = (index: number) => (e: DragEvent) => {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== index) {
      const to = index > dragIndex ? index - 1 : index;
      movePreview(dragIndex, to);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOverAt = (index: number) => (e: DragEvent) => {
    if (dragIndex === null) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  // --- Upload ---
  const handleConfirmUpload = async () => {
    if (pendingFiles.length === 0 || !project) return;
    setConfirmUpload(false);
    setIsUploading(true);
    setUploadError(null);
    setLastUploadErrors(null);
    document.body.style.overflow = "hidden";

    const total = pendingFiles.length;
    const jobs = pendingFiles.map((file, index) => ({ file, index }));
    const uploaded: string[] = [];
    const failedNames: string[] = [];
    const prepared: (File | null)[] = new Array(total).fill(null);

    // Phase 1: сжатие всех файлов (отдельный прогресс, чтобы не "висело" на 0)
    setUploadProgress({ phase: "prepare", done: 0, total });
    const prepareQueue = [...jobs];
    const prepareWorkers = Array.from(
      { length: Math.min(2, prepareQueue.length) },
      async () => {
        while (prepareQueue.length > 0) {
          const job = prepareQueue.shift()!;
          try {
            prepared[job.index] = await prepareImageFile(job.file);
          } catch (e) {
            console.error("Prepare error:", job.file.name, e);
          }
          setUploadProgress((p) =>
            p && p.phase === "prepare" ? { ...p, done: p.done + 1 } : p
          );
        }
      }
    );
    await Promise.all(prepareWorkers);

    // Phase 2: загрузка, 2 воркера (облако стабильнее)
    setUploadProgress({ phase: "upload", done: 0, total });
    const recordFailure = (name: string, reason: string) => {
      failedNames.push(name);
      setLastUploadErrors((prev) =>
        prev ? prev + "\n" + name + ": " + reason : name + ": " + reason
      );
    };
    const uploadQueue = [...jobs];
    const uploadWorkers = Array.from(
      { length: Math.min(2, uploadQueue.length) },
      async () => {
        while (uploadQueue.length > 0) {
          const job = uploadQueue.shift()!;
          const preparedFile = prepared[job.index];
          if (!preparedFile) {
            recordFailure(job.file.name, "файл не удалось подготовить");
          } else {
            try {
              const result = await uploadImageWithRetry(preparedFile, 3);
              uploaded.push(result.url);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              console.error("Upload error:", job.file.name, msg);
              recordFailure(job.file.name, msg);
            }
          }
          setUploadProgress((p) =>
            p && p.phase === "upload" ? { ...p, done: p.done + 1 } : p
          );
        }
      }
    );
    await Promise.all(uploadWorkers);

    if (uploaded.length > 0) {
      const replacing = (project?.imageUrls?.length || 0) > 0;
      if (replacing) {
        await startNewRound(projectId, uploaded);
      } else {
        await updateProject(projectId, {
          imageUrls: uploaded,
          status: "in_progress",
        });
      }
      const fresh = await getProject(projectId);
      setProject(fresh || { ...project, imageUrls: uploaded });
      onProjectUpdated();
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      setPendingFiles([]);
      setPreviewUrls([]);
      if (failedNames.length > 0) {
        showToast(
          replacing
            ? `Макеты заменены (${uploaded.length}), не загрузилось: ${failedNames.join(", ")}`
            : `Загружено ${uploaded.length} из ${total}, не загрузилось: ${failedNames.join(", ")}`
        );
      } else {
        showToast(
          replacing
            ? `Раунд ${fresh?.currentRound ?? (project?.currentRound || 1) + 1}: макеты заменены. Осталось раундов: ${fresh?.roundsLeft ?? 0}`
            : `Пакет загружен (${uploaded.length} изображений)`
        );
      }
    } else {
      setUploadError("Не удалось загрузить изображения. Попробуй ещё раз.");
    }

    setUploadProgress(null);
    setIsUploading(false);
    document.body.style.overflow = "";
  };

  const handleCancelUpload = () => {
    setConfirmUpload(false);
  };

  // --- Add an extra round (докупка раунда правок) ---
  const handleAddRound = async () => {
    await addExtraRounds(projectId, 1, maxRounds);
    const fresh = await getProject(projectId);
    if (fresh) {
      setProject(fresh);
      onProjectUpdated();
      showToast("Раунд добавлен — клиент снова может оставлять правки");
    }
  };

  // --- Copy comments as text ---
  const copyComments = async () => {
    const imageCount = project?.imageUrls?.length || 0;
    const lines: string[] = [];
    for (const m of roundMarkers) {
      if (m.type === "point" && m.x != null && m.y != null) {
        const cols = imageCount <= 3 ? imageCount : 3;
        const rows = Math.ceil(imageCount / cols);
        const imgIndex = Math.floor((m.y || 0) * rows) * cols + Math.floor((m.x || 0) * cols);
        const label = `Изображение ${Math.min(imageCount, imgIndex + 1)}`;
        lines.push(`• ${label}: ${m.text}`);
      } else {
        lines.push(`• Общий комментарий: ${m.text}`);
      }
    }
    if (lines.length === 0) {
      showToast("Правок пока нет");
      return;
    }
    try {
      await navigator.clipboard.writeText(
        "Правки по проекту «" + (project?.name || "") + "»:\n" + lines.join("\n")
      );
      showToast("Правки скопированы");
    } catch (e) {
      showToast("Не удалось скопировать");
    }
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
  const currentRound = project.currentRound || 1;
  const roundsLeft = project.roundsLeft ?? 0;
  const roundsTotal = project.roundsTotal ?? 0;
  const maxRounds = getMaxRoundsForPlan(plan);
  const canBuyRounds = canAddRounds(project, maxRounds);
  // Правки текущего раунда (в `markers` приходят все раунды — для истории)
  const roundMarkers = markers.filter((m) => m.round === currentRound);

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

  // --- History viewer (старые раунды) ---
  if (historyView) {
    const historyPackage = project.packageHistory?.find(
      (p) => p.round === historyView.round
    );
    if (historyPackage && historyPackage.imageUrls.length > 0) {
      const histUrls = historyPackage.imageUrls;
      const histIndex = Math.min(historyView.index, histUrls.length - 1);
      const histCount = histUrls.length;
      const histMarkers = markers.filter(
        (m) => m.round === historyView.round && m.type === "point"
      );
      const histCols = histCount <= 3 ? histCount : 3;
      const histRows = Math.ceil(histCount / histCols);
      const imgCol = histIndex % histCols;
      const imgRow = Math.floor(histIndex / histCols);
      const pointMarkers = histMarkers.filter((m) => {
        const minX = imgCol / histCols;
        const maxX = (imgCol + 1) / histCols;
        const minY = imgRow / histRows;
        const maxY = (imgRow + 1) / histRows;
        return (m.x || 0) >= minX && (m.x || 0) < maxX && (m.y || 0) >= minY && (m.y || 0) < maxY;
      });
      const setHist = (fn: (v: { round: number; index: number }) => { round: number; index: number }) =>
        setHistoryView((v) => (v ? fn(v) : v));
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setHistoryView(null)}
              className="rounded-lg p-2 text-white/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm text-white/70">
              Раунд {historyView.round} (история) · {histIndex + 1} / {histCount}
            </span>
            <button
              onClick={() => setHistoryView(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
            >
              К текущему раунду
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="mx-auto max-w-4xl">
              <div className="relative inline-block w-full">
                <img src={histUrls[histIndex]} alt="" className="w-full rounded-xl border border-white/10" />
                {pointMarkers.map((marker) => {
                  const localX = ((marker.x || 0) - imgCol / histCols) * histCols;
                  const localY = ((marker.y || 0) - imgRow / histRows) * histRows;
                  return (
                    <div key={marker.id} className="absolute group" style={{ left: `${localX * 100}%`, top: `${localY * 100}%`, transform: "translate(-50%, -50%)" }}>
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-text-primary border-2 border-white/80 shadow-lg">
                        <span className="text-[10px] font-bold text-bg-page">#</span>
                      </div>
                      <div className="absolute left-8 top-1/2 z-40 -translate-y-1/2 w-64 rounded-xl border border-white/10 bg-bg-card p-3 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                        <p className="text-sm text-text-primary">{marker.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {histUrls.length > 1 && (
            <>
              <button
                onClick={() => setHist((v) => ({ round: v.round, index: Math.max(0, v.index - 1) }))}
                disabled={histIndex === 0}
                className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/80 hover:text-white disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path d="m15 18-6-6 6-6" /></svg>
              </button>
              <button
                onClick={() => setHist((v) => ({ round: v.round, index: Math.min(histUrls.length - 1, v.index + 1) }))}
                disabled={histIndex === histUrls.length - 1}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 p-2 text-white/80 hover:text-white disabled:opacity-30"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path d="m9 18 6-6-6-6" /></svg>
              </button>
            </>
          )}
        </div>
      );
    }
  }

  // --- Image viewer mode (with markers) ---
  if (viewingImageIndex !== null && project.imageUrls?.[viewingImageIndex]) {
    const allMarkers = roundMarkers.filter((m) => m.type === "point");
    const pointMarkers = allMarkers.filter((m) => {
      const cols = imageCount <= 3 ? imageCount : 3;
      const rows = Math.ceil(imageCount / cols);
      const imgRow = Math.floor(viewingImageIndex / cols);
      const imgCol = viewingImageIndex % cols;
      const minX = imgCol / cols;
      const maxX = (imgCol + 1) / cols;
      const minY = imgRow / rows;
      const maxY = (imgRow + 1) / rows;
      return (m.x || 0) >= minX && (m.x || 0) < maxX && (m.y || 0) >= minY && (m.y || 0) < maxY;
    });
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
              {pointMarkers.map((marker) => {
                const cols = imageCount <= 3 ? imageCount : 3;
                const imgCol = viewingImageIndex % cols;
                const imgRow = Math.floor(viewingImageIndex / cols);
                const localX = ((marker.x || 0) - imgCol / cols) * cols;
                const localY = ((marker.y || 0) - imgRow / Math.ceil(imageCount / cols)) * Math.ceil(imageCount / cols);
                return (
                  <div key={marker.id} className="absolute group" style={{ left: `${localX * 100}%`, top: `${localY * 100}%`, transform: "translate(-50%, -50%)" }}>
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-text-primary border-2 border-white/80 shadow-lg transition-transform group-hover:scale-125">
                      <span className="text-[10px] font-bold text-bg-page">#</span>
                    </div>
                    <div className="absolute left-8 top-1/2 z-40 -translate-y-1/2 w-64 rounded-xl border border-border-strong bg-bg-card p-3 shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                      <p className="text-sm text-text-primary">{marker.text}</p>
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
          <div className="group flex min-w-0 flex-1 items-center gap-1.5">
            {renaming ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") setRenaming(false);
                }}
                onBlur={commitRename}
                autoFocus
                className="w-full rounded-lg border border-border-strong bg-bg-input px-2 py-1 text-sm font-semibold text-text-primary focus:border-text-primary focus:outline-none"
              />
            ) : (
              <>
                <h1
                  className="truncate text-sm font-semibold text-text-primary cursor-pointer hover:text-text-secondary transition-colors"
                  onClick={startRename}
                  title="Нажмите, чтобы переименовать"
                >
                  {project.name}
                </h1>
                <button
                  type="button"
                  onClick={startRename}
                  className="shrink-0 rounded-md p-1 text-text-muted transition-all hover:text-text-primary"
                  title="Переименовать"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </button>
              </>
            )}
            {hasImages && (
              <p className="hidden sm:block text-xs text-text-muted">
                {roundMarkers.length} {roundMarkers.length === 1 ? "правка" : roundMarkers.length > 0 && roundMarkers.length < 5 ? "правки" : "правок"} · раунд {currentRound} из {roundsTotal || "∞"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
            title="Удалить проект"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </header>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-6">

        {/* ===== EMPTY STATE ===== */}
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
            <p className="text-xs text-text-muted">PNG, JPG или WebP, до {MAX_IMAGES_PER_PROJECT} изображений</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
          </div>
        )}

        {/* ===== PENDING FILES ===== */}
        {hasPending && (
          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-medium text-text-primary">
                {hasImages ? "Новые макеты" : "Новый пакет"} ({pendingFiles.length})
              </h3>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-strong bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-all hover:bg-bg-cardHover">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-3.5 w-3.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Добавить ещё
                <input type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
              </label>
            </div>
            {!isTouch && (
              <p className="mb-3 text-xs text-text-muted">
                Порядок — как клиент увидит изображения. Перетащите, чтобы изменить.
              </p>
            )}

            <div className="space-y-2">
              {previewUrls.map((url, index) => (
                <Fragment key={index}>
                  {isDragging && (
                    <DropIndicator
                      active={dragOverIndex === index}
                      onDragOver={handleDragOverAt(index)}
                      onDrop={handleDropAt(index)}
                    />
                  )}
                  <div
                    draggable={!isTouch}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(index));
                      setDragIndex(index);
                      setDragOverIndex(index);
                    }}
                    onDragOver={handleDragOverAt(index)}
                    onDrop={handleDropAt(index)}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`group flex items-center gap-3 rounded-xl border bg-bg-card p-2 transition-all cursor-grab active:cursor-grabbing ${
                      dragIndex === index
                        ? "border-transparent opacity-0"
                        : dragOverIndex === index && dragIndex !== null
                          ? "border-border-strong"
                          : "border-border-strong hover:border-text-primary/30"
                    }`}
                  >
                    {!isTouch && (
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 shrink-0 text-text-muted">
                        <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                        <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                        <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                      </svg>
                    )}
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-bg-page">
                      {index + 1}
                    </div>
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-strong bg-bg-input">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-1">
                      {isTouch && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); movePreview(index, index - 1); }} disabled={index === 0} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-20">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="m18 15-6-6-6 6"/></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); movePreview(index, index + 1); }} disabled={index === pendingFiles.length - 1} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-20">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="m6 9 6 6 6-6"/></svg>
                          </button>
                        </>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); setFullscreenIndex(index); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); removePreview(index); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-400 hover:text-red-300">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M18 6 6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                </Fragment>
              ))}
              {isDragging && (
                <DropIndicator
                  active={dragOverIndex === pendingFiles.length}
                  onDragOver={handleDragOverAt(pendingFiles.length)}
                  onDrop={handleDropAt(pendingFiles.length)}
                />
              )}
            </div>

            {(uploadError || lastUploadErrors) && (
              <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {uploadError && <div className="font-medium">{uploadError}</div>}
                {lastUploadErrors && (
                  <div className="mt-1 whitespace-pre-wrap break-all opacity-90">{lastUploadErrors}</div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setConfirmUpload(true)}
              className="mt-4 w-full rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
            >
              {hasImages ? "Заменить макеты" : "Загрузить пакет"} ({pendingFiles.length} изображений)
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
                <button type="button" onClick={() => { navigator.clipboard.writeText(shareUrl); showToast("Ссылка скопирована"); }} className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]">
                  Копировать
                </button>
              </div>
            </div>

            {/* Rounds status */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-border-strong bg-bg-card px-3 py-1.5 text-xs font-medium text-text-primary">
                Раунд {currentRound} из {roundsTotal || "∞"}
              </span>
              {hasRoundsLeft(project) ? (
                <span className="rounded-lg border border-border-strong bg-bg-card px-3 py-1.5 text-xs text-text-muted">
                  Осталось раундов правок: {roundsLeft}
                </span>
              ) : (
                <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                  Раунды правок исчерпаны — клиент не может оставить новые правки
                </span>
              )}
              {!hasRoundsLeft(project) && canBuyRounds && (
                <button
                  type="button"
                  onClick={handleAddRound}
                  className="rounded-lg border border-text-primary/40 bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  + Добавить раунд
                </button>
              )}
            </div>

            {/* Promo: раунды кончились и докупить больше нельзя */}
            {!hasRoundsLeft(project) && !canBuyRounds && (
              <div className="mb-4 rounded-xl border border-text-primary/20 bg-bg-card p-4">
                <p className="text-sm font-medium text-text-primary">
                  У вас закончились раунды правок
                </p>
                <p className="mt-1 text-xs leading-relaxed text-text-muted">
                  Если ваш клиент хочет ещё — переходите на Pro, где раунды правок
                  без ограничения.
                </p>
                <a
                  href="/pricing"
                  className="mt-3 flex items-center justify-center rounded-xl bg-text-primary px-4 py-2.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  Перейти на Pro
                </a>
              </div>
            )}

            {/* Copy comments */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={copyComments}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-bg-card px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Скопировать все правки ({roundMarkers.length})
              </button>
              <button
                type="button"
                onClick={() => { setCanvasOpen(true); setCanvasIndex(0); }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-bg-card px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21" />
                </svg>
                Перейти на холст
              </button>
              <button
                type="button"
                onClick={() => setReplaceConfirm(true)}
                disabled={!hasRoundsLeft(project)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-bg-card px-4 py-3 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bg-card"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {hasRoundsLeft(project) ? "Заменить макеты" : "Раунды исчерпаны"}
              </button>
            </div>

            {/* History versions */}
            {(project.packageHistory?.length || 0) > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-sm font-medium text-text-primary">История версий</h3>
                <div className="space-y-2">
                  {[...(project.packageHistory || [])].reverse().map((pkg) => {
                    const pkgMarkers = markers.filter((m) => m.round === pkg.round);
                    return (
                      <div key={pkg.round} className="flex items-center justify-between gap-3 rounded-xl border border-border-strong bg-bg-card p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-text-primary">Раунд {pkg.round}</p>
                          <p className="text-xs text-text-muted">
                            {pkg.imageUrls.length} {pkg.imageUrls.length === 1 ? "изображение" : pkg.imageUrls.length < 5 ? "изображения" : "изображений"} · {pkgMarkers.length} {pkgMarkers.length === 1 ? "правка" : pkgMarkers.length > 0 && pkgMarkers.length < 5 ? "правки" : "правок"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setHistoryView({ round: pkg.round, index: 0 })}
                          className="shrink-0 rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90"
                        >
                          Открыть
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Comments list */}
            {roundMarkers.length > 0 && (
              <div className="mb-6 space-y-2">
                <h3 className="text-sm font-medium text-text-primary">Правки раунда {currentRound} ({roundMarkers.length})</h3>
                {roundMarkers.map((m) => (
                  <div key={m.id} className="flex items-start gap-3 rounded-xl border border-border-strong bg-bg-card p-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-bg-page">
                      {m.type === "point" ? "#" : "!"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-text-primary">{m.text}</p>
                      <p className="mt-0.5 text-[10px] text-text-muted">
                        {m.type === "point"
                          ? "Точка на изображении " + (imageCount > 0 ? Math.floor((m.y || 0) * Math.ceil(imageCount / (imageCount <= 3 ? imageCount : 3))) * (imageCount <= 3 ? imageCount : 3) + Math.floor((m.x || 0) * (imageCount <= 3 ? imageCount : 3)) + 1 : 1)
                          : "Общий комментарий"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Images list */}
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-text-primary">
                Изображения ({imageCount})
              </h3>
              {lastUploadErrors && (
                <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <div className="font-medium">Не удалось загрузить:</div>
                  <div className="mt-1 whitespace-pre-wrap break-all opacity-90">{lastUploadErrors}</div>
                </div>
              )}
              <div className="space-y-2">
                {project.imageUrls!.map((url, index) => (
                  <div key={index} className="group relative flex items-center gap-3 rounded-xl border border-border-strong bg-bg-card p-2 transition-all hover:border-text-primary/30 cursor-pointer" onClick={() => setViewingImageIndex(index)}>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-text-primary text-sm font-bold text-bg-page">
                      {index + 1}
                    </div>
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border-strong bg-bg-input">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setFullscreenIndex(index)} className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-cardHover hover:text-text-primary" title="Открыть на весь экран">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete project modal */}
      <ConfirmModal
        open={confirmDelete}
        title="Удалить проект?"
        message="Проект будет скрыт. Лимит на бесплатном тарифе считается по всем созданным проектам — слот не освободится."
        confirmLabel="Удалить"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Replace images modal */}
      <ConfirmModal
        open={replaceConfirm}
        title="Заменить макеты?"
        message={`Текущий пакет перейдёт в историю (раунд ${currentRound}), правки клиента сохранятся. Начнётся раунд ${currentRound + 1}, останется раундов: ${roundsLeft - 1}.`}
        confirmLabel="Выбрать файлы"
        danger
        onConfirm={() => {
          setReplaceConfirm(false);
          fileInputRef.current?.click();
        }}
        onCancel={() => setReplaceConfirm(false)}
      />

      {/* Upload confirmation modal */}
      <ConfirmModal
        open={confirmUpload}
        title={hasImages ? "Заменить макеты?" : "Загрузить изображения?"}
        message={hasImages
          ? "Текущие макеты и все правки клиента будут заменены. Это действие нельзя отменить."
          : "Будет загружено " + pendingFiles.length + " изображений. После загрузки появится ссылка для клиента."}
        confirmLabel={hasImages ? "Заменить" : "Загрузить"}
        onConfirm={handleConfirmUpload}
        onCancel={handleCancelUpload}
      />

      {/* Uploading overlay */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-page/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-border-strong bg-bg-card px-8 py-6 shadow-2xl">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
            <p className="text-sm text-text-primary">
              {uploadProgress
                ? uploadProgress.phase === "prepare"
                  ? `Подготовка ${uploadProgress.done} из ${uploadProgress.total}...`
                  : `Загрузка ${uploadProgress.done} из ${uploadProgress.total}...`
                : "Загрузка..."}
            </p>
          </div>
        </div>
      )}

      {/* Canvas: просмотр макетов с маячками текущего раунда */}
      {canvasOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => setCanvasOpen(false)}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/20"
            >
              Закрыть
            </button>
            <p className="text-sm text-white/80">
              Раунд {currentRound} · {canvasIndex + 1} / {imageCount}
            </p>
            <button
              type="button"
              onClick={() => {
                setCanvasShowMarkers((v) => !v);
                setCanvasSelectedMarker(null);
              }}
              className="rounded-xl border border-white/20 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
            >
              {canvasShowMarkers ? "С маячками" : "Без маячков"}
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-4">
            {(() => {
              const urls = project.imageUrls || [];
              const url = urls[canvasIndex];
              if (!url) return null;
              const pointMarkers = roundMarkers.filter(
                (m) => m.type === "point" && m.x !== undefined && m.y !== undefined
              );
              const generalMarkers = roundMarkers.filter((m) => m.type === "general");
              return (
                <>
                  <div className="relative flex h-full w-full items-center justify-center">
                    <img
                      src={url}
                      alt={`Макет ${canvasIndex + 1}`}
                      className="max-h-full max-w-full select-none object-contain"
                      draggable={false}
                    />
                    {canvasShowMarkers &&
                      pointMarkers.map((m, i) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCanvasSelectedMarker(m.id)}
                          className="absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/90 bg-text-primary text-xs font-bold text-bg-page shadow-lg transition-transform hover:scale-125"
                          style={{ left: `${(m.x || 0) * 100}%`, top: `${(m.y || 0) * 100}%` }}
                        >
                          {i + 1}
                        </button>
                      ))}
                    {canvasShowMarkers && canvasSelectedMarker && (
                      (() => {
                        const sel = roundMarkers.find((m) => m.id === canvasSelectedMarker);
                        if (!sel) return null;
                        return (
                          <div className="absolute left-1/2 top-4 z-30 w-72 -translate-x-1/2 rounded-xl border border-white/20 bg-bg-card p-3 shadow-2xl">
                            <p className="text-sm text-text-primary">{sel.text}</p>
                            <button
                              type="button"
                              onClick={() => setCanvasSelectedMarker(null)}
                              className="mt-2 text-xs text-text-muted transition-colors hover:text-text-primary"
                            >
                              Закрыть
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </div>
                  {imageCount > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => { setCanvasIndex((p) => Math.max(0, p - 1)); setCanvasSelectedMarker(null); }}
                        disabled={canvasIndex === 0}
                        className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 disabled:opacity-30"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCanvasIndex((p) => Math.min(imageCount - 1, p + 1)); setCanvasSelectedMarker(null); }}
                        disabled={canvasIndex >= imageCount - 1}
                        className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-all hover:bg-white/20 disabled:opacity-30"
                      >
                        ›
                      </button>
                    </>
                  )}
                  {canvasShowMarkers && generalMarkers.length > 0 && (
                    <div className="absolute bottom-4 left-1/2 z-30 max-h-32 w-72 -translate-x-1/2 space-y-1.5 overflow-y-auto rounded-xl border border-white/20 bg-bg-card/90 p-3 backdrop-blur-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                        Общие правки ({generalMarkers.length})
                      </p>
                      {generalMarkers.map((m) => (
                        <p key={m.id} className="text-xs text-text-primary">{m.text}</p>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
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

function DropIndicator({
  active,
  onDragOver,
  onDrop,
}: {
  active: boolean;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`flex h-8 items-center transition-colors ${
        active ? "bg-bg-cardHover/50" : ""
      }`}
    >
      <div
        className={`h-0.5 flex-1 rounded-full transition-colors ${
          active ? "bg-white" : "bg-transparent"
        }`}
      />
    </div>
  );
}
