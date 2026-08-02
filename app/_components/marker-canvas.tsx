"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CanvasViewer } from "./canvas-viewer";
import { subscribeToProjectMarkers, type Marker } from "@/lib/markers";
import {
  loadDraft,
  saveDraft,
  newDraftId,
  type ReviewDraftItem,
} from "@/lib/review-draft";

interface MarkerCanvasProps {
  imageUrls: string[];
  projectId: string;
  round: number;
  isLocked: boolean;
  markersVisible?: boolean;
  onToggleMarkers?: () => void;
}

export function MarkerCanvas({
  imageUrls,
  projectId,
  round,
  isLocked,
  markersVisible,
  onToggleMarkers,
}: MarkerCanvasProps) {
  const [sentMarkers, setSentMarkers] = useState<Marker[]>([]);
  const [draft, setDraft] = useState<ReviewDraftItem[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pendingImageIndex, setPendingImageIndex] = useState(0);
  const [markerText, setMarkerText] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    item: ReviewDraftItem;
    number: number | null;
  } | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches || "ontouchstart" in window);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const unsub = subscribeToProjectMarkers(projectId, round, (m) => {
      setSentMarkers(m);
    });
    return () => unsub();
  }, [projectId, round]);

  // Черновик из localStorage + обновление извне (общий комментарий из шапки)
  useEffect(() => {
    setDraft(loadDraft(projectId));
    const onDraft = () => setDraft(loadDraft(projectId));
    window.addEventListener("revio:draft-changed", onDraft);
    return () => window.removeEventListener("revio:draft-changed", onDraft);
  }, [projectId]);

  const persist = useCallback(
    (next: ReviewDraftItem[]) => {
      setDraft(next);
      saveDraft(projectId, next);
    },
    [projectId]
  );

  const nextOrder =
    draft.reduce((m, d) => Math.max(m, d.order), 0) + 1;

  const handleAddPoint = (
    x: number,
    y: number,
    imageIndex: number
  ) => {
    if (isLocked) return;
    setPendingPoint({ x, y });
    setPendingImageIndex(imageIndex);
    setMarkerText("");
  };

  const handleAddMarker = () => {
    const text = markerText.trim();
    if (!text) return;
    if (pendingPoint) {
      persist([
        ...draft,
        {
          id: newDraftId(),
          type: "point",
          x: pendingPoint.x,
          y: pendingPoint.y,
          imageIndex: pendingImageIndex,
          text,
          order: nextOrder,
        },
      ]);
      setPendingPoint(null);
    } else {
      persist([
        ...draft,
        { id: newDraftId(), type: "general", text, order: nextOrder },
      ]);
    }
    setMarkerText("");
  };

  const handleDeleteDraft = (id: string) => {
    persist(draft.filter((d) => d.id !== id));
    if (pendingPoint) setPendingPoint(null);
  };

  const draftDeleteNumber = (d: ReviewDraftItem): number | null => {
    if (d.type !== "point") return null;
    const idx = draft
      .filter((x) => x.type === "point")
      .findIndex((x) => x.id === d.id);
    return idx >= 0 ? sentPointCount + idx + 1 : null;
  };

  const requestDelete = (d: ReviewDraftItem) => {
    setDeleteConfirm({ item: d, number: draftDeleteNumber(d) });
  };

  const onDeleteMarker = (id: string) => {
    const d = draft.find((x) => x.id === id);
    if (!d) return;
    requestDelete(d);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    handleDeleteDraft(deleteConfirm.item.id);
    setDeleteConfirm(null);
  };

  // Объединяем отправленные правки и черновик для отрисовки на фото
  const markers: Marker[] = useMemo(() => {
    const sentMax = sentMarkers.reduce(
      (m, x) => Math.max(m, x.createdAt?.toMillis() || 0),
      0
    );
    const drafts: Marker[] = draft.map((d) => ({
      id: d.id,
      projectId,
      round,
      type: d.type,
      x: d.x,
      y: d.y,
      imageIndex: d.imageIndex,
      text: d.text,
      createdAt: {
        toMillis: () => sentMax + 1 + d.order,
      } as Marker["createdAt"],
    }));
    return [...sentMarkers, ...drafts];
  }, [sentMarkers, draft, projectId, round]);

  const draftIds = useMemo(() => new Set(draft.map((d) => d.id)), [draft]);
  const sentPointCount = sentMarkers.filter((m) => m.type === "point").length;

  const pointForm = pendingPoint ? (() => {
    let tx = "-50%", ty = "-50%", ml = 0, mt = 0;
    if (pendingPoint.x >= 0.5) {
      tx = "-100%";
      ml = -16;
    } else {
      ml = 16;
    }
    if (pendingPoint.y < 0.18) {
      ty = "0";
      mt = 8;
    } else if (pendingPoint.y > 0.85) {
      ty = "-100%";
      mt = -8;
    }
    return (
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.95 }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="absolute z-30 w-72 max-w-[min(18rem,80vw)] rounded-xl border border-white/20 bg-bg-card p-4 shadow-2xl"
        style={{
          left: `${pendingPoint.x * 100}%`,
          top: `${pendingPoint.y * 100}%`,
          transform: `translate(${tx}, ${ty})`,
          marginLeft: ml,
          marginTop: mt,
        }}
      >
        <textarea
          value={markerText}
          onChange={(e) => setMarkerText(e.target.value)}
          placeholder="Опишите правку..."
          rows={3}
          autoFocus
          className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setPendingPoint(null);
              setMarkerText("");
            }}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleAddMarker}
            disabled={!markerText.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-text-primary px-3 py-1.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </motion.div>
    );
  })() : null;

  const draftPanel = (
    <>
      <div className="border-b border-border-strong px-4 py-2.5 text-xs font-medium text-text-primary">
        Мои правки ({draft.length})
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {draft.map((d, i) => (
          <div
            key={d.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-cardHover"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-text-primary text-[10px] font-bold text-bg-page">
              {d.type === "point" ? sentPointCount + i + 1 : "!"}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs text-text-primary">
              {d.text}
            </span>
            <button
              type="button"
              onClick={() => requestDelete(d)}
              className="shrink-0 rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-red-400"
              title="Удалить"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </>
  );

  const canvas = (
    <div className="relative min-w-0 flex-1">
      <CanvasViewer
        imageUrls={imageUrls}
        markers={markers}
        canAdd={!isLocked}
        locked={isLocked}
        onAddPoint={handleAddPoint}
        onDeleteMarker={isLocked ? undefined : onDeleteMarker}
        canDeleteIds={draftIds}
        pendingPoint={pendingPoint}
        pointForm={pointForm}
        showToggle={false}
        markersVisible={markersVisible}
        onToggleMarkers={onToggleMarkers}
      />
    </div>
  );

  return (
    <div className="relative h-full w-full">
      {isMobile ? (
        <>
          {canvas}

          {/* Мобильная панель «Мои правки» */}
          {!isLocked && draft.length > 0 && (
            <AnimatePresence>
              {panelOpen ? (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  className="absolute inset-x-0 bottom-0 z-40 flex max-h-[45%] flex-col overflow-hidden rounded-t-2xl border-t border-border-strong bg-bg-card shadow-2xl"
                >
                  <button
                    type="button"
                    onClick={() => setPanelOpen(false)}
                    className="flex items-center justify-center gap-1.5 border-b border-border-strong px-4 py-2 text-xs font-medium text-text-primary"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                    >
                      <path d="M18 15l-6-6-6 6" />
                    </svg>
                    Свернуть
                  </button>
                  {draftPanel}
                </motion.div>
              ) : (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full border border-border-strong bg-bg-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xl"
                >
                  Мои правки ({draft.length})
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </>
      ) : (
        <div className="flex h-full w-full">
          {!isLocked && draft.length > 0 && (
            <div className="my-3 ml-3 flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-border-strong bg-bg-card shadow-xl">
              {draftPanel}
            </div>
          )}
          {canvas}
        </div>
      )}

      {/* Подтверждение удаления правки */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border-strong bg-bg-card p-6 shadow-2xl">
            <h2 className="mb-2 text-lg font-semibold text-text-primary">
              {deleteConfirm.number !== null
                ? `Удалить правку №${deleteConfirm.number}?`
                : "Удалить общий комментарий?"}
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-text-muted">
              «{deleteConfirm.item.text}» будет удалено из черновика.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-border-strong px-4 py-2.5 text-sm font-medium text-text-primary transition-all hover:bg-bg-cardHover"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-600"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
