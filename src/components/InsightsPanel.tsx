"use client";

import { useState } from "react";

export interface InsightQuote {
  text: string;
  source: string;
}

export interface InsightSummary {
  text: string;
  tags: string[];
}

export interface InsightTheme {
  name: string;
  description: string;
}

export interface Insights {
  quotes: InsightQuote[];
  summaries: InsightSummary[];
  themes: InsightTheme[];
}

interface InsightsPanelProps {
  insights: Insights | null;
  isLoading: boolean;
  onInsert: (html: string) => void;
}

type TabId = "quotes" | "summaries" | "themes";

export default function InsightsPanel({
  insights,
  isLoading,
  onInsert,
}: InsightsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("quotes");

  const tabs: { id: TabId; label: string; icon: string; color: string; count: number }[] = [
    {
      id: "quotes",
      label: "Quotes",
      icon: "💬",
      color: "var(--accent-50)",
      count: insights?.quotes?.length || 0,
    },
    {
      id: "summaries",
      label: "Summaries",
      icon: "📋",
      color: "var(--primary-40)",
      count: insights?.summaries?.length || 0,
    },
    {
      id: "themes",
      label: "Themes",
      icon: "🏷️",
      color: "var(--success-40)",
      count: insights?.themes?.length || 0,
    },
  ];

  const handleInsertQuote = (quote: InsightQuote) => {
    onInsert(`<blockquote style="border-left: 3px solid var(--accent-50); padding-left: 12px; margin: 12px 0; color: var(--neutral-30); font-style: italic;">"${quote.text}"<br><small style="color: var(--neutral-50);">— ${quote.source}</small></blockquote>`);
  };

  const handleInsertSummary = (summary: InsightSummary) => {
    onInsert(`<p style="margin: 12px 0;">${summary.text}</p>`);
  };

  const handleInsertTheme = (theme: InsightTheme) => {
    onInsert(`<p style="margin: 12px 0;"><strong>${theme.name}:</strong> ${theme.description}</p>`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-border-light shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-2 py-2.5 text-xs font-medium flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-current text-text-primary"
                : "border-transparent text-text-muted hover:text-text-secondary"
            }`}
            style={activeTab === tab.id ? { color: tab.color } : undefined}
          >
            <span>{tab.icon}</span>
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[10px] bg-surface rounded-full px-1.5">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-8 h-8 border-2 border-[var(--primary-80)] border-t-[var(--primary-40)] rounded-full animate-spin" />
            <p className="text-xs text-text-muted">Analyzing sources...</p>
          </div>
        ) : !insights ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
            <span className="text-3xl">📚</span>
            <p className="text-sm text-text-secondary font-medium">No insights yet</p>
            <p className="text-xs text-text-muted">
              Add sources to the left panel and insights will appear here automatically
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Quotes tab */}
            {activeTab === "quotes" &&
              insights.quotes?.map((quote, i) => (
                <div
                  key={i}
                  className="group p-3 rounded-lg bg-[var(--accent-90)] border border-[var(--accent-80)] hover:shadow-sm"
                >
                  <p className="text-sm text-[var(--accent-10)] italic leading-relaxed">
                    &ldquo;{quote.text}&rdquo;
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-[var(--accent-30)]">— {quote.source}</span>
                    <button
                      onClick={() => handleInsertQuote(quote)}
                      className="opacity-0 group-hover:opacity-100 text-xs font-medium text-[var(--accent-30)] hover:text-[var(--accent-10)] px-2 py-0.5 rounded bg-[var(--accent-80)] hover:bg-[var(--accent-70)] transition-all"
                    >
                      Insert ↵
                    </button>
                  </div>
                </div>
              ))}

            {/* Summaries tab */}
            {activeTab === "summaries" &&
              insights.summaries?.map((summary, i) => (
                <div
                  key={i}
                  className="group p-3 rounded-lg bg-[var(--primary-90)] border border-[var(--primary-80)] hover:shadow-sm"
                >
                  <p className="text-sm text-[var(--primary-10)] leading-relaxed">{summary.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex gap-1 flex-wrap">
                      {summary.tags?.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary-80)] text-[var(--primary-20)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => handleInsertSummary(summary)}
                      className="opacity-0 group-hover:opacity-100 text-xs font-medium text-[var(--primary-30)] hover:text-[var(--primary-10)] px-2 py-0.5 rounded bg-[var(--primary-80)] hover:bg-[var(--primary-70)] transition-all shrink-0 ml-2"
                    >
                      Insert ↵
                    </button>
                  </div>
                </div>
              ))}

            {/* Themes tab */}
            {activeTab === "themes" &&
              insights.themes?.map((theme, i) => (
                <div
                  key={i}
                  className="group p-3 rounded-lg bg-[var(--success-90)] border border-[var(--success-80)] hover:shadow-sm"
                >
                  <p className="text-sm font-semibold text-[var(--success-10)]">{theme.name}</p>
                  <p className="text-xs text-[var(--success-20)] mt-1 leading-relaxed">
                    {theme.description}
                  </p>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => handleInsertTheme(theme)}
                      className="opacity-0 group-hover:opacity-100 text-xs font-medium text-[var(--success-30)] hover:text-[var(--success-10)] px-2 py-0.5 rounded bg-[var(--success-80)] hover:bg-[var(--success-70)] transition-all"
                    >
                      Insert ↵
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
