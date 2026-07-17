"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
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
  const [pendingMarker, setPendingMarker] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showGeneralForm, setShowGeneralForm] = useState(false);
  const [markerText, setMarkerText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const [markerToDelete, setMarkerToDelete] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragMovedRef = useRef(false);

  useEffect(() => {
    const unsub = subscribeToProjectMarkers(projectId, round, (m) => {
      setMarkers(m);
    });
    return () => unsub();
  }, [projectId, round]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked || isDragging || dragMovedRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    setPendingMarker({ x, y });
    setMarkerText("");
  };

  const handleSubmitMarker = async () => {
    if (!markerText.trim()) return;

    setIsSubmitting(true);
    try {
      if (pendingMarker) {
        await createMarker({
          projectId,
          round,
          type: "point",
          x: pendingMarker.x,
          y: pendingMarker.y,
          text: markerText.trim(),
        });
        setPendingMarker(null);
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
      setMarkerToDelete(null);
    } catch (error) {
      console.error("Failed to delete marker:", error);
    }
  };

  const handleZoomIn = () => setScale((p) => Math.min(p + 0.25, 3));
  const handleZoomOut = () => setScale((p) => Math.max(p - 0.25, 1));

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragMovedRef.current = false;
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    dragMovedRef.current = true;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleNextImage = () => {
    if (currentIndex < imageUrls.length - 1) setCurrentIndex((p) => p + 1);
  };
  const handlePrevImage = () => {
    if (currentIndex > 0) setCurrentIndex((p) => p - 1);
  };

  const currentImageUrl = imageUrls[currentIndex];
  const currentMarkers = markers.filter(
    (m) => m.type === "point" && m.x !== undefined && m.y !== undefined
  );

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      ref={containerRef}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: scale > 1 ? (isDragging ? "grabbing" : "grab") : "crosshair",
        }}
      >
        <div
          className="relative"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transition: isDragging ? "none" : "transform 0.2s ease-out",
          }}
          onClick={handleImageClick}
        >
          <img
            src={currentImageUrl}
            alt="Project"
            className="max-w-full max-h-[calc(100vh-8rem)] object-contain select-none"
            draggable={false}
          />
        </div>
      </div>

      {currentMarkers.map((marker) => (
        <div
          key={marker.id}
          className="absolute group"
          style={{
            left: `${(marker.x || 0) * 100}%`,
            top: `${(marker.y || 0) * 100}%`,
            transform: "translate(-50%, -50%)",
            zIndex: hoveredMarker === marker.id ? 30 : 10,
          }}
        >
          <div
            className={cn(
              "relative flex h-6 w-6 -translate-x-1 -translate-y-1 items-center justify-center rounded-full border-2 border-white/80 shadow-lg transition-transform",
              marker.type === "point" ? "bg-text-primary" : "bg-blue-500",
              hoveredMarker === marker.id && "scale-125"
            )}
            onMouseEnter={() => setHoveredMarker(marker.id)}
            onMouseLeave={() => setHoveredMarker(null)}
          >
            {marker.type === "general" && (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2}
                className="h-3 w-3"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            )}
          </div>

          {hoveredMarker === marker.id && (
            <div className="absolute left-8 top-1/2 z-40 -translate-y-1/2 w-64 rounded-xl border border-border-strong bg-bg-card p-3 shadow-2xl">
              <p className="text-sm text-text-primary">{marker.text}</p>
              {marker.type === "point" && (
                <p className="mt-1 text-[10px] text-text-muted">
                  ({Math.round((marker.x || 0) * 100)}%,{" "}
                  {Math.round((marker.y || 0) * 100)}%)
                </p>
              )}
              {!isLocked && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMarkerToDelete(marker.id);
                  }}
                  className="mt-2 text-[10px] text-red-400 hover:text-red-300 transition-colors"
                >
                  Удалить
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-bg-card/90 backdrop-blur-sm border border-border-strong rounded-xl p-2">
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={scale <= 1}
          className="p-2 rounded-lg text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M8 11h6" />
          </svg>
        </button>
        <span className="text-sm text-text-primary min-w-[3rem] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={scale >= 3}
          className="p-2 rounded-lg text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
            <path d="M11 8v6" />
            <path d="M8 11h6" />
          </svg>
        </button>
      </div>

      {imageUrls.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrevImage}
            disabled={currentIndex === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-bg-card/90 backdrop-blur-sm border border-border-strong text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
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
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleNextImage}
            disabled={currentIndex === imageUrls.length - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-bg-card/90 backdrop-blur-sm border border-border-strong text-text-primary hover:bg-bg-cardHover disabled:opacity-50 transition-colors"
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
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-bg-card/90 backdrop-blur-sm border border-border-strong rounded-lg px-3 py-1.5 text-sm text-text-primary">
            {currentIndex + 1} / {imageUrls.length}
          </div>
        </>
      )}

      <AnimatePresence>
        {pendingMarker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute z-20 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-4 w-72"
            style={{
              left: `${pendingMarker.x * 100}%`,
              top: `${pendingMarker.y * 100}%`,
              transform: "translate(-50%, -100%) translateY(-16px)",
            }}
          >
            <textarea
              value={markerText}
              onChange={(e) => setMarkerText(e.target.value)}
              placeholder="Опишите правку..."
              rows={3}
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              autoFocus
            />
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPendingMarker(null);
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
        )}
      </AnimatePresence>

      {!isLocked && (
        <button
          type="button"
          onClick={() => setShowGeneralForm(true)}
          className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl bg-text-primary px-4 py-3 text-sm font-medium text-bg-page shadow-lg transition-all hover:opacity-90 active:scale-[0.98]"
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
            className="absolute bottom-4 right-4 z-20 bg-bg-card border border-border-strong rounded-xl shadow-2xl p-4 w-80"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-text-primary">
                Общий комментарий
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowGeneralForm(false);
                  setMarkerText("");
                }}
                className="rounded-lg p-1 text-text-muted hover:bg-bg-cardHover hover:text-text-primary transition-colors"
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
              className="w-full resize-none rounded-lg border border-border-strong bg-bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-primary focus:outline-none"
              autoFocus
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

      <AnimatePresence>
        {markerToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <div className="bg-bg-card border border-border-strong rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h2 className="text-lg font-semibold text-text-primary mb-2">
                Удалить маркер?
              </h2>
              <p className="text-sm text-text-muted mb-4">
                Это действие нельзя отменить.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMarkerToDelete(null)}
                  className="rounded-lg border border-border-strong px-4 py-2 text-sm text-text-primary transition-all hover:bg-bg-cardHover"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMarker(markerToDelete)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-600"
                >
                  Удалить
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
