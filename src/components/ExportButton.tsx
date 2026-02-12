"use client";

import { useCallback } from "react";
import { htmlToMarkdown } from "@/lib/markdown";

interface ExportButtonProps {
  title: string;
  content: string;
}

export default function ExportButton({ title, content }: ExportButtonProps) {
  const handleExport = useCallback(() => {
    const markdown = htmlToMarkdown(content);
    const fullContent = title ? `# ${title}\n\n${markdown}` : markdown;

    const blob = new Blob([fullContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "untitled"}.md`.replace(/\s+/g, "-").toLowerCase();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [title, content]);

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border hover:bg-surface hover:border-[var(--neutral-70)] transition-colors text-text-secondary"
      title="Export as Markdown"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Export .md
    </button>
  );
}
