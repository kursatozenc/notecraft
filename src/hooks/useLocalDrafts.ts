"use client";

import { useState, useEffect, useCallback } from "react";
import { Source } from "@/hooks/useLocalDraft";

export interface DraftMeta {
  id: string;
  title: string;
  updatedAt: number; // Unix ms
  wordCount: number;
  sourceCount: number;
  excerpt: string; // first ~80 chars of plain text
}

export interface DraftFull extends DraftMeta {
  content: string;
  sources: Source[];
}

const STORAGE_KEY = "notecraft-drafts-v2";

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(html: string): number {
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

function makeExcerpt(html: string): string {
  const text = stripHtml(html);
  return text.length > 80 ? text.substring(0, 80) + "…" : text;
}

function loadAll(): DraftFull[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DraftFull[];
  } catch {
    return [];
  }
}

function saveAll(drafts: DraftFull[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // storage full
  }
}

export function useLocalDrafts() {
  const [drafts, setDrafts] = useState<DraftFull[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setDrafts(loadAll());
    setIsLoaded(true);
  }, []);

  const createDraft = useCallback((): string => {
    const id = generateId();
    const now = Date.now();
    const newDraft: DraftFull = {
      id,
      title: "",
      content: "",
      sources: [],
      updatedAt: now,
      wordCount: 0,
      sourceCount: 0,
      excerpt: "",
    };
    setDrafts((prev) => {
      const updated = [newDraft, ...prev];
      saveAll(updated);
      return updated;
    });
    return id;
  }, []);

  const deleteDraft = useCallback((id: string) => {
    setDrafts((prev) => {
      const updated = prev.filter((d) => d.id !== id);
      saveAll(updated);
      return updated;
    });
  }, []);

  // Called by the editor page to persist changes
  const saveDraft = useCallback((draft: DraftFull) => {
    const enriched: DraftFull = {
      ...draft,
      updatedAt: Date.now(),
      wordCount: countWords(draft.content),
      sourceCount: draft.sources.length,
      excerpt: makeExcerpt(draft.content),
    };
    setDrafts((prev) => {
      const idx = prev.findIndex((d) => d.id === draft.id);
      let updated: DraftFull[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = enriched;
      } else {
        updated = [enriched, ...prev];
      }
      // Sort by most recent
      updated.sort((a, b) => b.updatedAt - a.updatedAt);
      saveAll(updated);
      return updated;
    });
  }, []);

  const getDraft = useCallback((id: string): DraftFull | null => {
    const all = loadAll();
    return all.find((d) => d.id === id) ?? null;
  }, []);

  return { drafts, isLoaded, createDraft, deleteDraft, saveDraft, getDraft };
}
