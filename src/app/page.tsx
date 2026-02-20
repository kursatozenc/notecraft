"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import SourcePanel from "@/components/SourcePanel";
import Editor from "@/components/Editor";
import RightPanel from "@/components/RightPanel";
import { Insights } from "@/components/InsightsPanel";
import ExportButton from "@/components/ExportButton";
import { useLocalDraft, Source } from "@/hooks/useLocalDraft";
import { DEMO_DRAFT, DEMO_INSIGHTS, DEMO_CHAT_MESSAGES } from "@/lib/demoData";

export default function Home() {
  const { draft, isLoaded, isDemoMode, updateTitle, updateContent, addSource, removeSource, dismissDemo } =
    useLocalDraft(DEMO_DRAFT);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const insightsDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Set demo insights when in demo mode (no API call)
  useEffect(() => {
    if (isDemoMode) {
      setInsights(DEMO_INSIGHTS);
    }
  }, [isDemoMode]);

  // Fetch insights when sources change
  const fetchInsights = useCallback(async (sources: Source[]) => {
    if (sources.length === 0) {
      setInsights(null);
      return;
    }

    setIsLoadingInsights(true);

    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sources }),
      });

      if (!response.ok) throw new Error("Failed to fetch insights");

      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error("Failed to fetch insights:", error);
    } finally {
      setIsLoadingInsights(false);
    }
  }, []);

  // Debounced insights fetch on source changes
  useEffect(() => {
    if (!isLoaded) return;

    // Skip API fetch when all sources are demo sources
    const allDemoSources = draft.sources.every((s) => s.id.startsWith("demo-"));
    if (allDemoSources && draft.sources.length > 0) return;

    if (insightsDebounceRef.current) {
      clearTimeout(insightsDebounceRef.current);
    }

    insightsDebounceRef.current = setTimeout(() => {
      if (draft.sources.length > 0) {
        fetchInsights(draft.sources);
      }
    }, 1000);

    return () => {
      if (insightsDebounceRef.current) {
        clearTimeout(insightsDebounceRef.current);
      }
    };
  }, [draft.sources, isLoaded, fetchInsights]);

  // Insert HTML into editor
  const insertIntoEditor = useCallback((html: string) => {
    const editorEl = editorContainerRef.current?.querySelector("[contenteditable]") as
      | (HTMLDivElement & { insertAtCursor?: (html: string) => void })
      | null;
    if (editorEl?.insertAtCursor) {
      editorEl.insertAtCursor(html);
    }
  }, []);

  // Handle slash commands
  const handleSlashCommand = useCallback(
    (commandId: string) => {
      if (commandId === "image") {
        setImagePrompt("");
      } else if (commandId === "summarize") {
        if (insights?.summaries?.[0]) {
          insertIntoEditor(
            `<p style="margin: 12px 0;">${insights.summaries[0].text}</p>`
          );
        } else {
          insertIntoEditor(
            `<p style="color: var(--neutral-50); font-style: italic;">Add sources to generate summaries...</p>`
          );
        }
      } else if (commandId === "quote") {
        if (insights?.quotes?.[0]) {
          insertIntoEditor(
            `<blockquote style="border-left: 3px solid var(--accent-50); padding-left: 12px; margin: 12px 0; color: var(--neutral-30); font-style: italic;">"${insights.quotes[0].text}"<br><small style="color: var(--neutral-50);">— ${insights.quotes[0].source}</small></blockquote>`
          );
        } else {
          insertIntoEditor(
            `<p style="color: var(--neutral-50); font-style: italic;">Add sources to pull quotes...</p>`
          );
        }
      }
    },
    [insights, insertIntoEditor]
  );

  // Handle image generation
  const handleGenerateImage = useCallback(
    async (prompt: string) => {
      setIsGeneratingImage(true);
      setImagePrompt(null);

      // Insert a placeholder while generating
      const placeholderId = `img-placeholder-${Date.now()}`;
      insertIntoEditor(
        `<div id="${placeholderId}" style="margin: 16px 0; padding: 24px; background: linear-gradient(135deg, var(--accent-90), var(--primary-90)); border-radius: 12px; text-align: center; border: 1px dashed var(--neutral-70);"><div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: var(--neutral-40); font-size: 14px;">🎨 <span>Generating "${prompt}"...</span></div></div>`
      );

      try {
        const response = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) throw new Error("Failed to generate image");

        const data = await response.json();

        // Replace placeholder with actual image
        const placeholder = editorContainerRef.current?.querySelector(`#${placeholderId}`);
        if (placeholder) {
          if (data.imageUrl) {
            placeholder.outerHTML = `<div style="margin: 16px 0; text-align: center;"><img src="${data.imageUrl}" alt="${prompt}" style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" /><p style="font-size: 12px; color: var(--neutral-50); margin-top: 4px;">Generated: ${prompt}</p></div>`;
          } else if (data.fallbackText) {
            placeholder.outerHTML = `<div style="margin: 16px 0; padding: 16px; background: var(--neutral-90); border-radius: 8px; text-align: center;"><p style="color: var(--neutral-40); font-size: 14px;">🎨 ${data.fallbackText}</p></div>`;
          }
          // Update content state
          const editor = editorContainerRef.current?.querySelector("[contenteditable]");
          if (editor) updateContent(editor.innerHTML);
        }
      } catch (error) {
        console.error("Image generation failed:", error);
        const placeholder = editorContainerRef.current?.querySelector(`#${placeholderId}`);
        if (placeholder) {
          placeholder.outerHTML = `<div style="margin: 16px 0; padding: 16px; background: var(--error-90); border-radius: 8px; text-align: center;"><p style="color: var(--error-30); font-size: 14px;">Failed to generate image. Try /image again.</p></div>`;
          const editor = editorContainerRef.current?.querySelector("[contenteditable]");
          if (editor) updateContent(editor.innerHTML);
        }
      } finally {
        setIsGeneratingImage(false);
      }
    },
    [insertIntoEditor, updateContent, editorContainerRef]
  );

  // Smart paste: add URL as source
  const handleSmartPaste = useCallback(
    (url: string) => {
      let domain: string;
      try {
        domain = new URL(url).hostname.replace("www.", "");
      } catch {
        domain = url;
      }
      addSource({
        id: Math.random().toString(36).substring(2, 9),
        type: "link",
        title: domain,
        url,
      });
    },
    [addSource]
  );

  // Dismiss demo and reset everything
  const handleDismissDemo = useCallback(() => {
    dismissDemo();
    setInsights(null);
  }, [dismissDemo]);

  if (!isLoaded) {
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
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary-40)] flex items-center justify-center shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-[var(--neutral-20)] tracking-tight">NoteCraft</span>
          </div>
          <div className="w-px h-5 bg-border mx-1 shrink-0" />
          <input
            type="text"
            value={draft.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Untitled Newsletter"
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

      {/* Demo banner */}
      {isDemoMode && (
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[var(--accent-90)] border-b border-[var(--accent-80)]">
          <div className="flex items-center gap-2">
            <span className="text-sm">✨</span>
            <span className="text-xs text-[var(--accent-20)] font-medium">
              You&apos;re viewing a demo — edit anything to make it yours
            </span>
          </div>
          <button
            onClick={handleDismissDemo}
            className="text-xs font-medium px-3 py-1 rounded-lg bg-[var(--accent-80)] hover:bg-[var(--accent-70)] text-[var(--accent-10)] transition-colors"
          >
            Start fresh
          </button>
        </div>
      )}

      {/* Main content: 3-column layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Source panel */}
        <SourcePanel
          sources={draft.sources}
          onAddSource={addSource}
          onRemoveSource={removeSource}
        />

        {/* Editor */}
        <div ref={editorContainerRef} className="flex-1 min-w-0">
          <Editor
            content={draft.content}
            onContentChange={updateContent}
            onSlashCommand={handleSlashCommand}
            onSmartPaste={handleSmartPaste}
          />
        </div>

        {/* Right panel: Chat + Insights */}
        <RightPanel
          insights={insights}
          isLoadingInsights={isLoadingInsights}
          isOpen={rightPanelOpen}
          onToggle={() => setRightPanelOpen(!rightPanelOpen)}
          onInsert={insertIntoEditor}
          sources={draft.sources}
          defaultTab={isDemoMode ? "insights" : "chat"}
          initialChatMessages={isDemoMode ? DEMO_CHAT_MESSAGES : undefined}
        />
      </main>

      {/* Image prompt dialog */}
      {imagePrompt !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 animate-fade-in-up">
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              🎨 Generate Image
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Describe the image you want for your newsletter
            </p>
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
              <button
                onClick={() => setImagePrompt(null)}
                className="text-sm px-4 py-2 rounded-lg text-text-secondary hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => imagePrompt && handleGenerateImage(imagePrompt)}
                disabled={!imagePrompt}
                className="text-sm px-4 py-2 rounded-lg bg-[var(--primary-40)] text-white hover:bg-[var(--primary-30)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
