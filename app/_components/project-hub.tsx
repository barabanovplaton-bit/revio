"use client";

import { useState, useEffect, useRef, useCallback, useMemo, Fragment, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getProject,
  updateProject,
  deleteProjectPermanently,
  startNewRound,
  hasRoundsLeft,
  getMaxRoundsForPlan,
  canAddRounds,
  addExtraRounds,
  type Project,
} from "@/lib/projects";
import {
  subscribeToAllProjectMarkers,
  toggleMarkerDone,
  type Marker,
} from "@/lib/markers";
import { getUserProfile, isOwner } from "@/lib/user-profile";
import { ConfirmModal } from "./confirm-modal";
import { CanvasViewer } from "./canvas-viewer";
import { FeedbackButton } from "./feedback-button";
import { cn } from "@/lib/utils";
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
  const dragDepth = useRef(0);
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
  const [viewRound, setViewRound] = useState<number | null>(null);
  const [markersVisible, setMarkersVisible] = useState(true);
  // Текущие страницы для счётчиков «N / M» в шапках просмотра
  const [canvasIndex, setCanvasIndex] = useState(0);
  const [histViewIndex, setHistViewIndex] = useState(0);
  const [viewIdx, setViewIdx] = useState(0);
  // Выбранная правка на холсте (правая деталь-панель фрилансера)
  const [canvasSelectedId, setCanvasSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setCanvasIndex(0);
    setCanvasSelectedId(null);
  }, [viewRound, canvasOpen]);

  useEffect(() => {
    setHistViewIndex(0);
  }, [historyView]);

  useEffect(() => {
    if (viewingImageIndex !== null) setViewIdx(viewingImageIndex);
  }, [viewingImageIndex]);

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
      // Владелец (админ) — всегда Pro (безлимит)
      if (!cancelled && prof) {
        setPlan(isOwner(prof.uid, prof.email) ? "pro" : prof.plan);
      } else if (!cancelled) {
        setPlan(isOwner(ownerUid, null) ? "pro" : "free");
      }
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

  // Блокируем скролл кабинета, пока открыт холст/история/просмотр
  useEffect(() => {
    const overlayOpen =
      canvasOpen ||
      historyView !== null ||
      viewingImageIndex !== null ||
      fullscreenIndex !== null;
    if (overlayOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      window.scrollTo(0, 0);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [canvasOpen, historyView, viewingImageIndex, fullscreenIndex]);

  // Автоскролл списка при перетаскивании к краям экрана
  useEffect(() => {
    if (dragIndex === null) return;
    const onMove = (e: MouseEvent) => {
      const y = e.clientY;
      const h = window.innerHeight;
      if (y < 80) window.scrollBy(0, -16);
      else if (y > h - 80) window.scrollBy(0, 16);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [dragIndex]);

  // Плашка «Проект создан» после перехода с мастера создания
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("created") === "1") {
      showToast("Проект создан");
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Глобальный guard: при драге файла мимо зоны иначе браузер открывает файл.
  useEffect(() => {
    const onDragOver = (e: globalThis.DragEvent) => e.preventDefault();
    const onDrop = (e: globalThis.DragEvent) => e.preventDefault();
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

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
  const handleDelete = () => {
    setConfirmDelete(false);
    onProjectDeleted();
    deleteProjectPermanently(projectId).catch((e) => {
      console.error("Failed to permanently delete project:", e);
    });
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
    const room = MAX_IMAGES_PER_PROJECT - base - pendingFiles.length;
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

  // Каждая карточка делится на две drop-зоны: верхняя «вставить перед этой»,
  // нижняя «вставить после этой». Где бы ты ни взялся, позиция вставки зависит
  // только от той половины, над которой сейчас курсор. dragOverIndex — это
  // позиция вставки (0..len, len = в самый конец). Всегда разрешаем и рисуем
  // линию, чтобы браузер не показывал «курсор-запрет».
  const handleDragOverAt = (position: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(position);
  };

  const handleDropAt = (position: number) => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const dragIdx = dragIndex;
    setDragOverIndex(null);
    if (dragIdx === null) return;
    // «Перед собой» и «сразу после себя» не меняют порядок — пропускаем.
    if (position === dragIdx || position === dragIdx + 1) return;
    const to = position > dragIdx ? position - 1 : position;
    movePreview(dragIdx, to);
  };

  const ghostRef = useRef<HTMLDivElement | null>(null);

  const createDragGhost = (el: HTMLElement) => {
    ghostRef.current?.remove();
    const clone = el.cloneNode(true) as HTMLDivElement;
    clone.style.position = "fixed";
    clone.style.top = "-10000px";
    clone.style.left = "-10000px";
    clone.style.width = `${el.offsetWidth}px`;
    clone.style.opacity = "0.8";
    clone.style.pointerEvents = "none";
    clone.style.margin = "0";
    document.body.appendChild(clone);
    ghostRef.current = clone;
    return clone;
  };

  const clearDragGhost = () => {
    ghostRef.current?.remove();
    ghostRef.current = null;
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

  // --- Mark a revision as done ---
  const handleToggleDone = async (id: string, done: boolean) => {
    try {
      await toggleMarkerDone(id, done);
    } catch (e) {
      console.error(e);
    }
  };

  // Доступные для просмотра раунды (с изображениями): текущий + история
  const availableRounds = useMemo(() => {
    const current = project?.currentRound || 1;
    const rounds: number[] = [current];
    for (const pkg of project?.packageHistory || []) {
      if (pkg.imageUrls.length > 0 && !rounds.includes(pkg.round)) {
        rounds.push(pkg.round);
      }
    }
    return rounds.sort((a, b) => a - b);
  }, [project?.currentRound, project?.packageHistory]);

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
  const isProPlan = plan === "pro";
  // Правки текущего раунда (в `markers` приходят все раунды — для холста и истории)
  const roundMarkers = markers.filter((m) => m.round === currentRound);
  // Есть ли правки клиента (можно ли заменять макеты) — только после «Готово»
  const hasClientRevisions = !!project.clientSubmitted;
  const replaceBlocked =
    !hasClientRevisions || (!isProPlan && !hasRoundsLeft(project));

  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/review/${projectId}`
      : `/review/${projectId}`;

  const imagesForRound = (round: number) => {
    if (round === currentRound) return project.imageUrls || [];
    const pkg = project.packageHistory?.find((p) => p.round === round);
    return pkg?.imageUrls || [];
  };

  const markersForRound = (round: number) =>
    markers.filter((m) => m.round === round);

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
      const histMarkers = markers.filter(
        (m) => m.round === historyView.round
      );
      return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setHistoryView(null)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white"
            >
              К текущему раунду
            </button>
            <span className="text-sm text-white/80">
              Раунд {historyView.round} (история) ·{" "}
              {histMarkers.filter((m) => m.type === "point").length} правок
              {histUrls.length > 1 &&
                ` · страница ${Math.min(histViewIndex + 1, histUrls.length)}/${histUrls.length}`}
            </span>
            <button
              onClick={() => setHistoryView(null)}
              className="rounded-lg p-2 text-white/70 hover:text-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <CanvasViewer
              imageUrls={histUrls}
              markers={histMarkers}
              readOnly
              showPanel
              onToggleDone={handleToggleDone}
              onImageChange={setHistViewIndex}
            />
          </div>
        </div>
      );
    }
  }

  // --- Image viewer mode (with markers) ---
  if (viewingImageIndex !== null && project.imageUrls?.[viewingImageIndex]) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-black">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setViewingImageIndex(null)}
            className="rounded-lg p-2 text-white/70 transition-colors hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm text-white/80">
            {project.name}
            {project.imageUrls.length > 1 &&
              ` · ${Math.min(viewIdx + 1, project.imageUrls.length)}/${project.imageUrls.length}`}
          </span>
          <button
            type="button"
            onClick={() => setViewingImageIndex(null)}
            className="rounded-lg p-2 text-white/70 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <CanvasViewer
            imageUrls={project.imageUrls}
            initialIndex={viewingImageIndex}
            markers={roundMarkers}
            readOnly
            showPanel
            onToggleDone={handleToggleDone}
            onImageChange={setViewIdx}
          />
        </div>
      </div>
    );
  }

  // === MAIN VIEW ===
  return (
    <div
      className="relative flex min-h-screen flex-col bg-bg-page"
      onDragEnter={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          dragDepth.current += 1;
          setIsDraggingOver(true);
        }
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
        }
      }}
      onDragLeave={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) setIsDraggingOver(false);
        }
      }}
      onDrop={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          dragDepth.current = 0;
          setIsDraggingOver(false);
          handleFiles(e.dataTransfer.files);
        }
      }}
    >
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
                maxLength={80}
                onChange={(e) => setRenameValue(e.target.value.slice(0, 80))}
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
                >
                  {project.name}
                </h1>
                <button
                  type="button"
                  onClick={startRename}
                  className="shrink-0 rounded-md p-1 text-text-muted transition-all hover:text-text-primary"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  </svg>
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 rounded-lg p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
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
                  {isDragging && dragOverIndex === index && (
                    <DropIndicator
                      active
                      onDragOver={handleDragOverAt(index)}
                      onDrop={handleDropAt(index)}
                    />
                  )}
                  {/* Каждая карточка делится на две drop-зоны (верх/низ) */}
                  <div className="relative">
                    {isDragging && (
                      <>
                        {/* Верхняя зона: вставить перед этой карточкой */}
                        <div
                          onDragOver={handleDragOverAt(index)}
                          onDrop={handleDropAt(index)}
                          className={cn(
                            "absolute inset-x-0 top-0 z-20 h-1/2",
                            dragOverIndex === index
                              ? "rounded-t-xl bg-text-primary/5"
                              : "pointer-events-none"
                          )}
                        />
                        {/* Нижняя зона: вставить после этой карточки (перед следующей) */}
                        <div
                          onDragOver={handleDragOverAt(index + 1)}
                          onDrop={handleDropAt(index + 1)}
                          className={cn(
                            "absolute inset-x-0 bottom-0 z-20 h-1/2",
                            dragOverIndex === index + 1
                              ? "rounded-b-xl bg-text-primary/5"
                              : "pointer-events-none"
                          )}
                        />
                      </>
                    )}
                    <div
                      draggable={!isTouch}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(index));
                        const ghost = createDragGhost(e.currentTarget);
                        e.dataTransfer.setDragImage(ghost, 32, 16);
                        setDragIndex(index);
                        setDragOverIndex(null);
                      }}
                      onDragEnd={() => {
                        setDragIndex(null);
                        setDragOverIndex(null);
                        clearDragGhost();
                      }}
                      className={`group flex items-center gap-3 rounded-xl border bg-bg-card p-2 transition-all cursor-grab active:cursor-grabbing ${
                        dragIndex === index
                          ? "opacity-10"
                          : dragOverIndex === index || dragOverIndex === index + 1
                            ? "border-text-primary/40"
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
                  </div>
                </Fragment>
              ))}
              {isDragging && dragOverIndex === pendingFiles.length && (
                <DropIndicator
                  active
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
              {hasRoundsLeft(project) ? (
                <span className="rounded-lg border border-border-strong bg-bg-card px-3 py-1.5 text-xs text-text-muted">
                  Раунд {currentRound} из {roundsTotal || "∞"} · осталось раундов правок: {roundsLeft}
                </span>
              ) : isProPlan ? (
                <span className="rounded-lg border border-border-strong bg-bg-card px-3 py-1.5 text-xs text-text-muted">
                  Раунд {currentRound} из {roundsTotal || "∞"} · раунды правок закончились
                </span>
              ) : (
                <span className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                  Раунды правок исчерпаны — клиент не может оставить новые правки
                </span>
              )}
              {!isProPlan && !hasRoundsLeft(project) && canBuyRounds && (
                <button
                  type="button"
                  onClick={handleAddRound}
                  className="rounded-lg border border-text-primary/40 bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-page transition-all hover:opacity-90 active:scale-[0.98]"
                >
                  + Добавить раунд
                </button>
              )}
              {project.clientSubmitted && (isProPlan || hasRoundsLeft(project)) && (
                <span className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400">
                  Клиент прислал правки
                </span>
              )}
            </div>

            {/* Promo: раунды кончились и докупить больше нельзя */}
            {!isProPlan && !hasRoundsLeft(project) && !canBuyRounds && (
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

            {/* Actions */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setViewRound(currentRound);
                  setCanvasOpen(true);
                }}
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
                onClick={() => {
                  if (replaceBlocked) {
                    if (!hasClientRevisions) {
                      showToast("Клиент ещё не прислал правки — «Заменить макеты» станет доступно, когда он нажмёт «Готово»");
                    } else if (!isProPlan && !hasRoundsLeft(project)) {
                      showToast("Раунды правок исчерпаны — добавьте раунд или перейдите на Pro");
                    } else {
                      showToast("Сейчас заменить макеты нельзя");
                    }
                    return;
                  }
                  setReplaceConfirm(true);
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl border border-border-strong bg-bg-card px-4 py-3 text-sm font-medium transition-all",
                  replaceBlocked
                    ? "text-text-muted"
                    : "text-text-primary hover:bg-bg-cardHover"
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {isProPlan || hasRoundsLeft(project) ? "Заменить макеты" : "Раунды исчерпаны"}
              </button>
            </div>
            {!hasClientRevisions && hasRoundsLeft(project) && (
              <p className="mb-4 -mt-2 text-center text-xs text-text-muted">
                «Заменить макеты» станет активной, когда клиент нажмёт «Готово».
              </p>
            )}

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

          </>
        )}
      </div>

      {/* Delete project modal */}
      <ConfirmModal
        open={confirmDelete}
        title="Удалить проект навсегда?"
        message="Все макеты, правки и уведомления проекта будут удалены из базы без возможности восстановления."
        confirmLabel="Удалить навсегда"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {/* Replace images modal */}
      <ConfirmModal
        open={replaceConfirm}
        title="Заменить макеты?"
        message={`Текущий пакет перейдёт в историю (раунд ${currentRound}), правки клиента сохранятся. Начнётся раунд ${currentRound + 1}. Осталось раундов правки: ${roundsLeft}.`}
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

      {/* Canvas: просмотр макетов с маячками, переключение раундов */}
      {canvasOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-page">
          <div className="flex items-center justify-between gap-3 border-b border-border-strong bg-bg-card px-4 py-2.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCanvasOpen(false)}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-primary transition-colors hover:bg-bg-cardHover"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M19 12H5" /><path d="m12 19-7-7 7-7" />
                </svg>
              </button>
              <p className="min-w-0 truncate text-sm font-medium text-text-primary">
                {project.name}
              </p>
              {availableRounds.length > 1 && (
                <div className="flex items-center gap-0.5 rounded-xl border border-border-strong bg-bg-input p-1">
                  <button
                    type="button"
                    onClick={() => setViewRound((r) => Math.max(availableRounds[0], (r ?? currentRound) - 1))}
                    disabled={(viewRound ?? currentRound) <= availableRounds[0]}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <span className="min-w-0 px-1 text-center text-xs font-medium text-text-primary">
                    Раунд {viewRound ?? currentRound}/{availableRounds.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewRound((r) => Math.min(availableRounds[availableRounds.length - 1], (r ?? currentRound) + 1))}
                    disabled={(viewRound ?? currentRound) >= availableRounds[availableRounds.length - 1]}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary disabled:opacity-30"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="m9 18 6-6-6-6"/></svg>
                  </button>
                </div>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setMarkersVisible((v) => !v)}
                className={cn(
                  "shrink-0 rounded-xl border px-3 py-2 text-xs font-medium transition-colors",
                  markersVisible
                    ? "border-border-strong bg-bg-input text-text-primary hover:bg-bg-cardHover"
                    : "border-border-strong bg-bg-card text-text-muted hover:text-text-primary"
                )}
              >
                {markersVisible ? "Без маячков" : "С маячками"}
              </button>
            </div>
          </div>
          <div className="flex flex-1 overflow-hidden">
            <CanvasViewer
              imageUrls={imagesForRound(viewRound ?? currentRound)}
              markers={markersForRound(viewRound ?? currentRound)}
              readOnly
              showPanel
              showToggle={false}
              markersVisible={markersVisible}
              onToggleMarkers={() => setMarkersVisible((v) => !v)}
              onToggleDone={handleToggleDone}
              onImageChange={setCanvasIndex}
              selectedId={canvasSelectedId}
              onSelectMarker={(id) => setCanvasSelectedId(id)}
              showBottomCard={false}
            />
            {(() => {
              const list = markersForRound(viewRound ?? currentRound);
              const selected = canvasSelectedId
                ? list.find((m) => m.id === canvasSelectedId) ?? null
                : null;
              const pointOrder = list
                .filter((m) => m.type === "point")
                .sort(
                  (a, b) =>
                    (a.createdAt?.toMillis() || 0) -
                    (b.createdAt?.toMillis() || 0)
                );
              const num =
                selected?.type === "point"
                  ? pointOrder.findIndex((m) => m.id === selected.id) + 1
                  : null;
              return (
                <aside className="flex w-[19rem] shrink-0 flex-col border-l border-border-strong bg-bg-card">
                  <div className="flex items-center justify-between border-b border-border-strong px-4 py-3">
                    <p className="text-sm font-medium text-text-primary">
                      {selected
                        ? selected.type === "general"
                          ? "Общая правка"
                          : `Правка №${num}`
                        : "Правка"}
                    </p>
                    {selected && (
                      <button
                        type="button"
                        onClick={() => setCanvasSelectedId(null)}
                        className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="h-4 w-4">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {selected ? (
                    <>
                      <div className="flex-1 overflow-y-auto p-4">
                        <p className={cn("break-words text-sm leading-relaxed", selected.done ? "line-through text-text-muted" : "text-text-primary")}>
                          {selected.text}
                        </p>
                      </div>
                      <div className="flex gap-2 border-t border-border-strong p-3">
                        <button
                          type="button"
                          onClick={() => handleToggleDone(selected.id, !selected.done)}
                          className={cn(
                            "flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                            selected.done
                              ? "bg-green-500 text-white"
                              : "border border-border-strong text-text-primary hover:bg-bg-cardHover"
                          )}
                        >
                          {selected.done ? "Сделано ✓" : "Сделать сделанным"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center p-4">
                      <p className="text-center text-xs leading-relaxed text-text-muted">
                        Нажмите на правку в списке слева или на маячок на макете, чтобы посмотреть текст.
                      </p>
                    </div>
                  )}
                </aside>
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      <FeedbackButton />

      {/* Оверлей перетаскивания файлов */}
      {isDraggingOver && (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-bg-page/80 p-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-text-primary px-10 py-8 text-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-10 w-10 text-text-primary">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-sm font-medium text-text-primary">
              Отпустите, чтобы добавить макеты
            </p>
          </div>
        </div>
      )}
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
      className={`flex h-1 items-center px-1 transition-colors ${
        active ? "bg-text-primary/10" : ""
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
