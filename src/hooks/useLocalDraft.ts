"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface Source {
  id: string;
  type: "link" | "text";
  title: string;
  url?: string;
  content?: string;
}

export interface Draft {
  title: string;
  content: string;
  sources: Source[];
}

const STORAGE_KEY = "notecraft-draft";
const DEBOUNCE_MS = 500;

const DEFAULT_DRAFT: Draft = {
  title: "",
  content: "",
  sources: [],
};

export function useLocalDraft() {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Draft;
        setDraft(parsed);
      }
    } catch {
      // Ignore parse errors, start fresh
    }
    setIsLoaded(true);
  }, []);

  // Auto-save with debounce
  const saveDraft = useCallback((newDraft: Draft) => {
    setDraft(newDraft);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newDraft));
      } catch {
        // Storage full or unavailable
      }
    }, DEBOUNCE_MS);
  }, []);

  const updateTitle = useCallback(
    (title: string) => {
      saveDraft({ ...draft, title });
    },
    [draft, saveDraft]
  );

  const updateContent = useCallback(
    (content: string) => {
      saveDraft({ ...draft, content });
    },
    [draft, saveDraft]
  );

  const addSource = useCallback(
    (source: Source) => {
      const newSources = [...draft.sources, source];
      saveDraft({ ...draft, sources: newSources });
    },
    [draft, saveDraft]
  );

  const removeSource = useCallback(
    (id: string) => {
      const newSources = draft.sources.filter((s) => s.id !== id);
      saveDraft({ ...draft, sources: newSources });
    },
    [draft, saveDraft]
  );

  const clearDraft = useCallback(() => {
    saveDraft(DEFAULT_DRAFT);
    localStorage.removeItem(STORAGE_KEY);
  }, [saveDraft]);

  return {
    draft,
    isLoaded,
    updateTitle,
    updateContent,
    addSource,
    removeSource,
    clearDraft,
  };
}
