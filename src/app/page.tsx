"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocalDrafts } from "@/hooks/useLocalDrafts";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "long" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function groupByDate(drafts: ReturnType<typeof useLocalDrafts>["drafts"]) {
  const groups: Record<string, typeof drafts> = {};
  for (const draft of drafts) {
    const d = new Date(draft.updatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    let label: string;
    if (diffDays === 0) label = "Today";
    else if (diffDays === 1) label = "Yesterday";
    else if (diffDays < 7) label = "This week";
    else if (diffDays < 30) label = "This month";
    else label = d.toLocaleDateString([], { month: "long", year: "numeric" });
    if (!groups[label]) groups[label] = [];
    groups[label].push(draft);
  }
  return groups;
}

export default function Home() {
  const router = useRouter();
  const { drafts, isLoaded, createDraft, deleteDraft } = useLocalDrafts();

  const handleNew = useCallback(() => {
    const id = createDraft();
    router.push(`/draft/${id}`);
  }, [createDraft, router]);

  const handleDelete = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Delete this draft?")) deleteDraft(id);
  }, [deleteDraft]);

  const groups = groupByDate(drafts);
  const groupKeys = Object.keys(groups);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary-80)] border-t-[var(--primary-40)] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-border-light bg-[var(--background)] sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[var(--primary-40)] flex items-center justify-center shadow-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
          <span className="text-sm font-bold text-[var(--neutral-20)] tracking-tight">NoteCraft</span>
        </div>

        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-xl bg-[var(--primary-40)] text-white hover:bg-[var(--primary-30)] transition-colors shadow-sm"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          New draft
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-8">
        {drafts.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--primary-90)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-30)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary mb-2" style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}>
                No drafts yet
              </p>
              <p className="text-sm text-text-muted">
                Start a new draft and bring your sources, ideas, and writing together.
              </p>
            </div>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-xl bg-[var(--primary-40)] text-white hover:bg-[var(--primary-30)] transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Create your first draft
            </button>
          </div>
        ) : (
          /* Draft list grouped by date */
          <div className="space-y-8">
            {groupKeys.map((group) => (
              <section key={group}>
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3 px-1">
                  {group}
                </h2>
                <div className="space-y-1">
                  {groups[group].map((draft) => (
                    <Link
                      key={draft.id}
                      href={`/draft/${draft.id}`}
                      className="group flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-white hover:shadow-sm border border-transparent hover:border-[var(--border-light)] transition-all"
                    >
                      {/* Icon */}
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-[var(--surface)] group-hover:bg-[var(--primary-90)] flex items-center justify-center transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--neutral-50)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="group-hover:stroke-[var(--primary-30)] transition-colors">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                        </svg>
                      </div>

                      {/* Title + excerpt */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate" style={{ fontFamily: "var(--font-dm-serif), Georgia, serif" }}>
                          {draft.title || "Untitled draft"}
                        </p>
                        {draft.excerpt && (
                          <p className="text-xs text-text-muted truncate mt-0.5">
                            {draft.excerpt}
                          </p>
                        )}
                      </div>

                      {/* Meta chips */}
                      <div className="shrink-0 flex items-center gap-2 text-[11px] text-text-muted">
                        {draft.sourceCount > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--surface)] group-hover:bg-[var(--primary-90)] transition-colors">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            {draft.sourceCount}
                          </span>
                        )}
                        {draft.wordCount > 0 && (
                          <span className="hidden sm:inline">{draft.wordCount}w</span>
                        )}
                        <span className="text-[11px]">{formatDate(draft.updatedAt)}</span>
                      </div>

                      {/* Delete button (shown on hover) */}
                      <button
                        onClick={(e) => handleDelete(e, draft.id)}
                        className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete draft"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
