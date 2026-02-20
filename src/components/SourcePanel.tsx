"use client";

import { useState, useRef, useCallback } from "react";
import { Source } from "@/hooks/useLocalDraft";

interface SourcePanelProps {
  sources: Source[];
  onAddSource: (source: Source) => void;
  onRemoveSource: (id: string) => void;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function getFaviconUrl(source: Source): string | null {
  if (source.type === "link" && source.url) {
    try {
      const domain = new URL(source.url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  }
  return null;
}

function getSourceColor(index: number): string {
  const colors = [
    "bg-[var(--primary-90)]",
    "bg-[var(--accent-90)]",
    "bg-[var(--success-90)]",
    "bg-[var(--primary-80)]",
    "bg-[var(--accent-80)]",
    "bg-[var(--success-80)]",
  ];
  return colors[index % colors.length];
}

export default function SourcePanel({ sources, onAddSource, onRemoveSource }: SourcePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const urlInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const text = e.dataTransfer.getData("text/plain");
      const url = e.dataTransfer.getData("text/uri-list");

      if (url || (text && text.startsWith("http"))) {
        const link = url || text;
        onAddSource({
          id: generateId(),
          type: "link",
          title: extractDomain(link),
          url: link,
        });
      } else if (text) {
        onAddSource({
          id: generateId(),
          type: "text",
          title: text.substring(0, 50) + (text.length > 50 ? "..." : ""),
          content: text,
        });
      }
    },
    [onAddSource]
  );

  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    const url = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
    onAddSource({
      id: generateId(),
      type: "link",
      title: extractDomain(url),
      url,
    });
    setUrlInput("");
    setShowUrlInput(false);
  }, [urlInput, onAddSource]);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");
      if (text.startsWith("http")) {
        e.preventDefault();
        onAddSource({
          id: generateId(),
          type: "link",
          title: extractDomain(text),
          url: text,
        });
      }
    },
    [onAddSource]
  );

  return (
    <div
      className={`relative h-full flex flex-col border-r border-border transition-all duration-200 ease-out ${
        isExpanded ? "w-[280px]" : "w-[56px]"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => {
        setIsExpanded(false);
        setShowUrlInput(false);
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-10 bg-[var(--primary-90)] border-2 border-dashed border-[var(--primary-40)] rounded-lg flex items-center justify-center">
          <div className="text-center">
            <span className="text-2xl">📎</span>
            <p className="text-sm text-[var(--primary-20)] mt-1 font-medium">Drop source</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-3 flex items-center gap-2 border-b border-border-light shrink-0">
        {isExpanded ? (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Sources
            </span>
            <span className="text-xs text-text-muted bg-surface rounded-full px-2 py-0.5">
              {sources.length}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center w-full gap-1">
            <span className="text-lg">📚</span>
            {sources.length > 0 && (
              <span className="text-[10px] text-text-muted">{sources.length}</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {isExpanded ? (
          <div className="space-y-2 animate-fade-in-up">
            {sources.map((source) => {
              const favicon = getFaviconUrl(source);
              return (
                <div
                  key={source.id}
                  className="group p-2.5 rounded-xl bg-white border border-[var(--border-light)] hover:border-[var(--border)] hover:shadow-sm cursor-default transition-all"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[var(--surface)] flex items-center justify-center shrink-0 mt-0.5 overflow-hidden">
                      {favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={favicon} alt="" className="w-4 h-4 object-contain" />
                      ) : (
                        <span className="text-xs">📝</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate leading-snug">
                        {source.title}
                      </p>
                      {source.url && (
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {extractDomain(source.url)}
                        </p>
                      )}
                      {source.content && (
                        <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5">
                          {source.content}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveSource(source.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-[var(--error-40)] shrink-0 text-xs p-0.5 mt-0.5 transition-opacity"
                      title="Remove source"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add URL input */}
            {showUrlInput ? (
              <div className="flex gap-1.5">
                <input
                  ref={urlInputRef}
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                  onPaste={handlePaste}
                  placeholder="Paste a URL..."
                  className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-white focus:border-[var(--primary-40)] focus:ring-1 focus:ring-[var(--primary-80)] outline-none"
                  autoFocus
                />
                <button
                  onClick={handleAddUrl}
                  className="text-xs px-2 py-1.5 rounded-md bg-[var(--primary-40)] text-white hover:bg-[var(--primary-30)]"
                >
                  Add
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setShowUrlInput(true);
                  setTimeout(() => urlInputRef.current?.focus(), 50);
                }}
                className="w-full text-xs py-2 rounded-lg border border-dashed border-border hover:border-[var(--primary-40)] hover:bg-[var(--primary-90)] text-text-muted hover:text-[var(--primary-20)] transition-colors"
              >
                + Add source
              </button>
            )}

            {sources.length === 0 && (
              <div className="text-center py-8 px-2">
                <div className="w-10 h-10 rounded-2xl bg-[var(--surface)] flex items-center justify-center mx-auto mb-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-50)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                  </svg>
                </div>
                <p className="text-xs font-medium text-text-secondary mb-1">Add your sources</p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Drop links or paste URLs to fuel AI insights
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pt-1">
            {sources.map((source, i) => {
              const favicon = getFaviconUrl(source);
              return (
                <div
                  key={source.id}
                  className={`w-8 h-8 rounded-xl ${getSourceColor(i)} flex items-center justify-center text-xs cursor-default overflow-hidden shadow-sm`}
                  title={source.title}
                >
                  {favicon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={favicon} alt="" className="w-4 h-4 object-contain" />
                  ) : (
                    <span>📝</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
