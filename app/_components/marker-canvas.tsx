"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CanvasViewer } from "./canvas-viewer";
import {
  createMarker,
  deleteMarker,
  subscribeToProjectMarkers,
  type Marker,
} from "@/lib/markers";

interface MarkerCanvasProps {
  imageUrls: string[];
  projectId: string;
  round: number;
  isLocked: boolean;
}

export function MarkerCanvas({
  imageUrls,
  projectId,
  round,
  isLocked,
}: MarkerCanvasProps) {
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [pendingPoint, setPendingPoint] = useState<{ x: number; y: number } | null>(null);
  const [pendingImageIndex, setPendingImageIndex] = useState(0);
  const [markerText, setMarkerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGeneralForm, setShowGeneralForm] = useState(false);

  useEffect(() => {
    const unsub = subscribeToProjectMarkers(projectId, round, (m) => {
      setMarkers(m);
    });
    return () => unsub();
  }, [projectId, round]);

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

  const handleSubmitMarker = async () => {
    if (!markerText.trim()) return;
    setIsSubmitting(true);
    try {
      if (pendingPoint) {
        await createMarker({
          projectId,
          round,
          type: "point",
          x: pendingPoint.x,
          y: pendingPoint.y,
          imageIndex: pendingImageIndex,
          text: markerText.trim(),
        });
        setPendingPoint(null);
      } else {
        await createMarker({
          projectId,
          round,
          type: "general",
          text: markerText.trim(),
        });
        setShowGeneralForm(false);
      }
      setMarkerText("");
    } catch (error) {
      console.error("Failed to create marker:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMarker = async (id: string) => {
    try {
      await deleteMarker(id);
    } catch (error) {
      console.error("Failed to delete marker:", error);
    }
  };

  const pointForm = pendingPoint ? (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-white/20 bg-bg-card p-4 shadow-2xl"
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
          disabled={isSubmitting}
          className="rounded-lg border border-border-strong px-3 py-1.5 text-sm text-text-primary transition-all hover:bg-bg-cardHover disabled:opacity-50"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleSubmitMarker}
          disabled={!markerText.trim() || isSubmitting}
          className="flex items-center gap-1.5 rounded-lg bg-text-primary px-3 py-1.5 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Отправка..." : "Отправить"}
        </button>
      </div>
    </motion.div>
  ) : null;

  return (
    <div className="relative h-full w-full">
      <CanvasViewer
        imageUrls={imageUrls}
        markers={markers}
        canAdd={!isLocked}
        locked={isLocked}
        onAddPoint={handleAddPoint}
        onDeleteMarker={handleDeleteMarker}
        pendingPoint={pendingPoint}
        pointForm={pointForm}
      />

      {/* Кнопка «Общий комментарий» */}
      {!isLocked && (
        <button
          type="button"
          onClick={() => setShowGeneralForm((v) => !v)}
          className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-bg-page shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="hidden sm:inline">Общий комментарий</span>
        </button>
      )}

      <AnimatePresence>
        {showGeneralForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 right-4 z-30 w-80 rounded-xl border border-white/20 bg-bg-card p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">
                Общий комментарий
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowGeneralForm(false);
                  setMarkerText("");
                }}
                className="rounded-lg p-1 text-text-muted transition-colors hover:bg-bg-cardHover hover:text-text-primary"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-4 w-4"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
            <textarea
              value={markerText}
              onChange={(e) => setMarkerText(e.target.value)}
              placeholder="Опишите общие правки..."
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSubmitMarker}
                disabled={!markerText.trim() || isSubmitting}
                className="flex items-center gap-1.5 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-page transition-all hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
