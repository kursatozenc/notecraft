"use client";

import { useState } from "react";
import InsightsPanel, { Insights } from "./InsightsPanel";
import ChatPanel from "./ChatPanel";
import { Source } from "@/hooks/useLocalDraft";

type PanelTab = "chat" | "insights";

interface RightPanelProps {
  insights: Insights | null;
  isLoadingInsights: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onInsert: (html: string) => void;
  sources: Source[];
  onAddSource: (source: Source) => void;
  onRemoveSource: (id: string) => void;
  defaultTab?: PanelTab;
  initialChatMessages?: Array<{ id: string; role: "user" | "assistant"; content: string }>;
}

export default function RightPanel({
  insights,
  isLoadingInsights,
  isOpen,
  onToggle,
  onInsert,
  sources,
  onAddSource,
  onRemoveSource,
  defaultTab,
  initialChatMessages,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>(defaultTab ?? "chat");

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="h-full w-[48px] flex flex-col items-center justify-center gap-3 border-l border-border-light hover:bg-surface transition-colors"
        title="Show AI panel"
      >
        <span className="text-lg">💬</span>
        <span className="text-lg">✨</span>
      </button>
    );
  }

  return (
    <div className="w-[360px] h-full flex flex-col border-l border-border animate-slide-right">
      {/* Header with tabs */}
      <div className="shrink-0 border-b border-border-light">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-0">
          <div className="flex gap-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-3 py-2 text-xs font-semibold tracking-wide border-b-2 transition-colors ${
                activeTab === "chat"
                  ? "border-[var(--primary-40)] text-[var(--primary-20)]"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`px-3 py-2 text-xs font-semibold tracking-wide border-b-2 transition-colors ${
                activeTab === "insights"
                  ? "border-[var(--accent-50)] text-[var(--accent-20)]"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              ✨ Insights
              {insights && (
                <span className="ml-1.5 text-[10px] bg-surface rounded-full px-1.5 py-0.5">
                  {(insights.quotes?.length || 0) +
                    (insights.summaries?.length || 0) +
                    (insights.themes?.length || 0)}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={onToggle}
            className="text-xs text-text-muted hover:text-text-primary p-1 mb-1"
            title="Close panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <ChatPanel
            sources={sources}
            onAddSource={onAddSource}
            onRemoveSource={onRemoveSource}
            onInsert={onInsert}
            initialMessages={initialChatMessages}
          />
        ) : (
          <InsightsPanel
            insights={insights}
            isLoading={isLoadingInsights}
            onInsert={onInsert}
          />
        )}
      </div>
    </div>
  );
}
