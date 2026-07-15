// components/provider/ProjectProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

type ProjectContextType = {
  projectId: string;
  projectName: string;
  setProject: (id: string, name: string) => void;
  reset: () => void;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({
  children,
  userId,
  useSessionStorage = true, // set to false to use localStorage
}: {
  children: ReactNode;
  userId?: string | null;
  useSessionStorage?: boolean;
}) {
  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const prevUserRef = useRef<string | null | undefined>(undefined);

  const getStorage = () =>
    typeof window === "undefined"
      ? null
      : useSessionStorage
        ? window.sessionStorage
        : window.localStorage;

  const getStorageKey = () => `project:${userId ?? "anon"}`;

  const writeProjectToStorage = (id: string, name: string) => {
    const storage = getStorage();
    if (!storage) return;

    try {
      storage.setItem(getStorageKey(), JSON.stringify({ id, name }));
    } catch {}
  };

  // Load from storage whenever the user changes (runs only in browser)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storage = getStorage();
    const storageKey = getStorageKey();
    if (!storage) return;

    // if user switched, read that user's saved project (or clear)
    if (prevUserRef.current !== userId) {
      prevUserRef.current = userId;
      try {
        const raw = storage.getItem(storageKey);
        if (raw) {
          const { id, name } = JSON.parse(raw) as { id?: string; name?: string };
          setProjectId(id || "");
          setProjectName(name || "");
        } else {
          setProjectId("");
          setProjectName("");
        }
      } catch {
        setProjectId("");
        setProjectName("");
      }
    }
  }, [userId, useSessionStorage]);

  // Persist current project to storage (browser only)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const storage = getStorage();
    const storageKey = getStorageKey();
    if (!storage) return;
    try {
      storage.setItem(storageKey, JSON.stringify({ id: projectId, name: projectName }));
    } catch {}
  }, [projectId, projectName, userId, useSessionStorage]);

  const setProject = (id: string, name: string) => {
    writeProjectToStorage(id, name);
    setProjectId(id);
    setProjectName(name);
  };

  const reset = () => {
    setProjectId("");
    setProjectName("");
    if (typeof window !== "undefined") {
      try {
        getStorage()?.removeItem(getStorageKey());
      } catch {}
    }
  };


  //We can here also return say schema, list of location and list of works. 

 

  return (
    <ProjectContext.Provider value={{ projectId, projectName, setProject, reset }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
