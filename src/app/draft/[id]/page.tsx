"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Editor from "@/components/Editor";
import RightPanel from "@/components/RightPanel";
import { Insights } from "@/components/InsightsPanel";
import ExportButton from "@/components/ExportButton";
import { Source } from "@/hooks/useLocalDraft";
import { useLocalDrafts, DraftFull } from "@/hooks/useLocalDrafts";

export default function DraftPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getDraft, saveDraft } = useLocalDrafts();

  const [draft, setDraft] = useState<DraftFull | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const insightsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load draft on mount
  useEffect(() => {
    const found = getDraft(id);
    if (!found) {
      router.replace("/");
      return;
    }
    setDraft(found);
    setIsLoaded(true);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save
  const persistDraft = useCallback((updated: DraftFull) => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(() => saveDraft(updated), 500);
  }, [saveDraft]);

  const updateTitle = useCallback((title: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, title };
      persistDraft(updated);
      return updated;
    });
  }, [persistDraft]);

  const updateContent = useCallback((content: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, content };
      persistDraft(updated);
      return updated;
    });
  }, [persistDraft]);

  const addSource = useCallback((source: Source) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, sources: [...prev.sources, source] };
      persistDraft(updated);
      return updated;
    });
  }, [persistDraft]);

  const removeSource = useCallback((sourceId: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, sources: prev.sources.filter((s) => s.id !== sourceId) };
      persistDraft(updated);
      return updated;
    });
  }, [persistDraft]);

  // Fetch insights when sources change
  const fetchInsights = useCallback(async (sources: Source[]) => {
    if (sources.length === 0) { setInsights(null); return; }
    setIsLoadingInsights(true);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });
      if (!response.ok) throw new Error("Failed");
      setInsights(await response.json());
    } catch { /* silent */ } finally {
      setIsLoadingInsights(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !draft) return;
    if (insightsDebounceRef.current) clearTimeout(insightsDebounceRef.current);
    insightsDebounceRef.current = setTimeout(() => {
      if (draft.sources.length > 0) fetchInsights(draft.sources);
    }, 1000);
    return () => { if (insightsDebounceRef.current) clearTimeout(insightsDebounceRef.current); };
  }, [draft?.sources, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Insert HTML into editor
  const insertIntoEditor = useCallback((html: string) => {
    const editorEl = editorContainerRef.current?.querySelector("[contenteditable]") as
      | (HTMLDivElement & { insertAtCursor?: (html: string) => void }) | null;
    if (editorEl?.insertAtCursor) editorEl.insertAtCursor(html);
  }, []);

  const handleSlashCommand = useCallback((commandId: string) => {
    if (commandId === "image") {
      setImagePrompt("");
    } else if (commandId === "summarize") {
      insertIntoEditor(
        insights?.summaries?.[0]
          ? `<p style="margin: 12px 0;">${insights.summaries[0].text}</p>`
          : `<p style="color: var(--neutral-50); font-style: italic;">Add sources to generate summaries...</p>`
      );
    } else if (commandId === "quote") {
      insertIntoEditor(
        insights?.quotes?.[0]
          ? `<blockquote style="border-left: 3px solid var(--accent-50); padding-left: 12px; margin: 12px 0; color: var(--neutral-30); font-style: italic;">"${insights.quotes[0].text}"<br><small style="color: var(--neutral-50);">— ${insights.quotes[0].source}</small></blockquote>`
          : `<p style="color: var(--neutral-50); font-style: italic;">Add sources to pull quotes...</p>`
      );
    }
  }, [insights, insertIntoEditor]);

  const handleGenerateImage = useCallback(async (prompt: string) => {
    setIsGeneratingImage(true);
    setImagePrompt(null);
    const placeholderId = `img-${Date.now()}`;
    insertIntoEditor(
      `<div id="${placeholderId}" style="margin:16px 0;padding:24px;background:linear-gradient(135deg,var(--accent-90),var(--primary-90));border-radius:12px;text-align:center;border:1px dashed var(--neutral-70);"><div style="color:var(--neutral-40);font-size:14px;">🎨 Generating &ldquo;${prompt}&rdquo;...</div></div>`
    );
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!response.ok) throw new Error("Failed");
      const data = await response.json();
      const placeholder = editorContainerRef.current?.querySelector(`#${placeholderId}`);
      if (placeholder) {
        placeholder.outerHTML = data.imageUrl
          ? `<div style="margin:16px 0;text-align:center;"><img src="${data.imageUrl}" alt="${prompt}" style="max-width:100%;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);"/></div>`
          : `<div style="margin:16px 0;padding:16px;background:var(--neutral-90);border-radius:8px;text-align:center;"><p style="color:var(--neutral-40);font-size:14px;">🎨 ${data.fallbackText}</p></div>`;
        const editor = editorContainerRef.current?.querySelector("[contenteditable]");
        if (editor) updateContent(editor.innerHTML);
      }
    } catch {
      const placeholder = editorContainerRef.current?.querySelector(`#${placeholderId}`);
      if (placeholder) {
        placeholder.outerHTML = `<div style="margin:16px 0;padding:16px;background:var(--error-90);border-radius:8px;text-align:center;"><p style="color:var(--error-30);font-size:14px;">Failed to generate image.</p></div>`;
      }
    } finally {
      setIsGeneratingImage(false);
    }
  }, [insertIntoEditor, updateContent]);

  const handleSmartPaste = useCallback((url: string) => {
    let domain: string;
    try { domain = new URL(url).hostname.replace("www.", ""); } catch { domain = url; }
    addSource({ id: Math.random().toString(36).substring(2, 9), type: "link", title: domain, url });
  }, [addSource]);

  if (!isLoaded || !draft) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary-80)] border-t-[var(--primary-40)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-border-light bg-[var(--background)]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Back to home */}
          <Link
            href="/"
            className="shrink-0 flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors group"
            title="All drafts"
          >
            <div className="w-7 h-7 rounded-lg bg-[var(--primary-40)] flex items-center justify-center shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-[var(--neutral-20)] tracking-tight">NoteCraft</span>
          </Link>

          <div className="flex items-center gap-1 text-text-muted shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>

          <input
            type="text"
            value={draft.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Untitled draft"
            className="flex-1 text-base font-medium bg-transparent border-none outline-none text-text-primary placeholder:text-[var(--neutral-60)] min-w-0"
            style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-4">
          {isGeneratingImage && (
            <span className="text-xs text-text-muted flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-[var(--accent-80)] border-t-[var(--accent-50)] rounded-full animate-spin" />
              Generating image...
            </span>
          )}
          <ExportButton title={draft.title} content={draft.content} />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        <div ref={editorContainerRef} className="flex-1 min-w-0">
          <Editor
            content={draft.content}
            onContentChange={updateContent}
            onSlashCommand={handleSlashCommand}
            onSmartPaste={handleSmartPaste}
          />
        </div>
        <RightPanel
          insights={insights}
          isLoadingInsights={isLoadingInsights}
          isOpen={rightPanelOpen}
          onToggle={() => setRightPanelOpen(!rightPanelOpen)}
          onInsert={insertIntoEditor}
          sources={draft.sources}
          onAddSource={addSource}
          onRemoveSource={removeSource}
          defaultTab="chat"
        />
      </main>

      {/* Image prompt dialog */}
      {imagePrompt !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-text-primary mb-1">🎨 Generate Image</h3>
            <p className="text-sm text-text-muted mb-4">Describe the image you want for your newsletter</p>
            <input
              type="text"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="e.g., A minimalist illustration of a person reading..."
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-border focus:border-[var(--primary-40)] focus:ring-2 focus:ring-[var(--primary-80)] outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && imagePrompt) handleGenerateImage(imagePrompt);
                if (e.key === "Escape") setImagePrompt(null);
              }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setImagePrompt(null)} className="text-sm px-4 py-2 rounded-lg text-text-secondary hover:bg-surface transition-colors">Cancel</button>
              <button
                onClick={() => imagePrompt && handleGenerateImage(imagePrompt)}
                disabled={!imagePrompt}
                className="text-sm px-4 py-2 rounded-lg bg-[var(--primary-40)] text-white hover:bg-[var(--primary-30)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >Generate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
