"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface Source {
  id: string;
  type: "link" | "text" | "pdf";
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
const VISITED_KEY = "notecraft-visited";
const DEBOUNCE_MS = 500;

const DEFAULT_DRAFT: Draft = {
  title: "",
  content: "",
  sources: [],
};

export function useLocalDraft(initialDraft?: Draft) {
  const [draft, setDraft] = useState<Draft>(DEFAULT_DRAFT);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft from localStorage on mount, with demo mode detection
  useEffect(() => {
    // Demo detection
    const params = new URLSearchParams(window.location.search);
    const hasUrlDemoParam = params.has("demo");
    const hasVisited = localStorage.getItem(VISITED_KEY) !== null;
    const hasSavedDraft = localStorage.getItem(STORAGE_KEY) !== null;
    const shouldDemo = hasUrlDemoParam || (!hasVisited && !hasSavedDraft);

    // Try loading saved draft from localStorage (always takes precedence)
    let loadedFromStorage = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Draft;
        setDraft(parsed);
        loadedFromStorage = true;
      }
    } catch {
      // Ignore parse errors
    }

    // If no saved data and demo should activate, use demo draft
    if (!loadedFromStorage && shouldDemo && initialDraft) {
      setDraft(initialDraft);
      setIsDemoMode(true);
    }

    // Mark as visited (not on ?demo — keep it repeatable for recordings)
    if (!hasUrlDemoParam && !hasVisited) {
      localStorage.setItem(VISITED_KEY, "true");
    }

    setIsLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const dismissDemo = useCallback(() => {
    setIsDemoMode(false);
    setDraft(DEFAULT_DRAFT);
    localStorage.removeItem(STORAGE_KEY);
    // Clean ?demo from URL without page reload
    const url = new URL(window.location.href);
    if (url.searchParams.has("demo")) {
      url.searchParams.delete("demo");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return {
    draft,
    isLoaded,
    isDemoMode,
    updateTitle,
    updateContent,
    addSource,
    removeSource,
    clearDraft,
    dismissDemo,
  };
}
