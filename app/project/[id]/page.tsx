"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { subscribeToAuth, type User } from "@/lib/auth";
import { ProjectHub } from "@/app/_components/project-hub";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-page">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-text-primary" />
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <ProjectHub
      projectId={id}
      ownerUid={user.uid}
      onBack={() => router.push("/")}
      onProjectDeleted={() => router.push("/")}
      onProjectUpdated={() => {}}
    />
  );
}
