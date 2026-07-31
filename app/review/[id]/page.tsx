"use client";

import { useState, useEffect, use } from "react";
import { getProject, type Project } from "@/lib/projects";
import { MarkerCanvas } from "@/app/_components/marker-canvas";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await getProject(id);
        if (cancelled) return;
        if (!p) {
          setError("Проект не найден");
        } else {
          setProject(p);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Не удалось загрузить проект");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
          </svg>
          <p className="text-text-muted">{error || "Проект не найден"}</p>
        </div>
      </div>
    );
  }

  // No images yet
  if (!project.imageUrls || project.imageUrls.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="max-w-md text-center px-4">
          <svg className="mx-auto mb-4 h-12 w-12 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
          <h1 className="mb-2 text-xl font-semibold text-text-primary">{project.name}</h1>
          <p className="text-text-muted">Макеты ещё не загружены. Фрилансер готовит проект.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-bg-page">
      <header className="flex items-center justify-between border-b border-border-strong bg-bg-card px-4 py-3">
        <div>
          <h1 className="font-semibold text-text-primary">{project.name}</h1>
          <p className="text-xs text-text-muted">
            Нажмите на картинку, чтобы оставить правку
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <MarkerCanvas
          imageUrls={project.imageUrls}
          projectId={project.id}
          round={1}
          isLocked={false}
        />
      </main>
    </div>
  );
}
