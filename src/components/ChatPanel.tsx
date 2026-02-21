"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Source } from "@/hooks/useLocalDraft";

// Lazy-load PDF.js only when needed
async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    pages.push(textContent.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n\n");
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  sources: Source[];
  onAddSource: (source: Source) => void;
  onRemoveSource: (id: string) => void;
  onInsert: (html: string) => void;
  initialMessages?: Message[];
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
    } catch { return null; }
  }
  return null;
}

function formatMessage(text: string): string {
  let html = text;
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  // Italic
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  // Bullet points
  html = html.replace(/^- (.*?)$/gm, "<li>$1</li>");
  html = html.replace(/((?:<li>[\s\S]*?<\/li>)+)/g, "<ul>$1</ul>");
  // Line breaks
  html = html.replace(/\n/g, "<br/>");
  return html;
}

export default function ChatPanel({ sources, onAddSource, onRemoveSource, onInsert, initialMessages }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<"url" | "text" | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevSourceCountRef = useRef(sources.length);

  // Reset messages when demo is dismissed
  useEffect(() => {
    if (!initialMessages) {
      setMessages([]);
    }
  }, [initialMessages]);

  // Auto-message when a new source is added
  useEffect(() => {
    const prev = prevSourceCountRef.current;
    const curr = sources.length;
    if (curr > prev) {
      const newSource = sources[curr - 1];
      const label = newSource.url ? extractDomain(newSource.url) : newSource.title;
      const autoMsg: Message = {
        id: generateId(),
        role: "assistant",
        content: `Got it — I've read **${label}**. What would you like to know?`,
      };
      setMessages((prev) => [...prev, autoMsg]);
    }
    prevSourceCountRef.current = curr;
  }, [sources]);

  const closePicker = useCallback(() => {
    setShowPicker(false);
    setPickerMode(null);
    setUrlInput("");
    setTextInput("");
    setTextTitle("");
  }, []);

  const handleAddUrl = useCallback(() => {
    if (!urlInput.trim()) return;
    const url = urlInput.startsWith("http") ? urlInput : `https://${urlInput}`;
    onAddSource({ id: generateId(), type: "link", title: extractDomain(url), url });
    closePicker();
  }, [urlInput, onAddSource, closePicker]);

  const handleAddText = useCallback(() => {
    if (!textInput.trim()) return;
    onAddSource({
      id: generateId(),
      type: "text",
      title: textTitle.trim() || textInput.substring(0, 40) + "...",
      content: textInput.trim(),
    });
    closePicker();
  }, [textInput, textTitle, onAddSource, closePicker]);

  const handlePdfUpload = useCallback(async (file: File) => {
    setIsPdfLoading(true);
    closePicker();
    try {
      const text = await extractPdfText(file);
      onAddSource({
        id: generateId(),
        type: "pdf",
        title: file.name.replace(/\.pdf$/i, ""),
        content: text,
      });
    } catch (e) {
      console.error("PDF extraction failed", e);
    } finally {
      setIsPdfLoading(false);
    }
  }, [onAddSource, closePicker]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Math.random().toString(36).substring(2, 9),
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          sources,
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: data.content,
      };

      setMessages([...newMessages, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: Math.random().toString(36).substring(2, 9),
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, sources]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleInsertResponse = useCallback(
    (content: string) => {
      const html = `<p style="margin: 12px 0;">${formatMessage(content)}</p>`;
      onInsert(html);
    },
    [onInsert]
  );

  return (
    <div className="flex flex-col h-full">

      {/* Sources strip */}
      <div className="shrink-0 border-b border-border-light px-3 py-2.5 bg-[var(--background)]">
        <div className="flex items-center gap-1.5 flex-wrap">
          {sources.map((source) => {
            const favicon = getFaviconUrl(source);
            return (
              <div
                key={source.id}
                className="group flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-lg bg-white border border-[var(--border-light)] text-xs text-text-secondary hover:border-[var(--border)] transition-all"
              >
                {favicon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={favicon} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" />
                ) : (
                  <span className="text-[10px]">📝</span>
                )}
                <span className="max-w-[100px] truncate font-medium">
                  {source.url ? extractDomain(source.url) : source.title}
                </span>
                <button
                  onClick={() => onRemoveSource(source.id)}
                  className="text-[var(--neutral-60)] hover:text-[var(--error-40)] transition-colors p-0.5 rounded"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}

          {/* Add source — hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdfUpload(f); e.target.value = ""; }}
          />

          {/* Add source button + popover */}
          <div className="relative">
            <button
              onClick={() => setShowPicker((v) => !v)}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-dashed border-[var(--border)] text-text-muted hover:border-[var(--primary-40)] hover:text-[var(--primary-30)] hover:bg-[var(--primary-90)] transition-all"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {isPdfLoading ? "Reading PDF..." : "Add source"}
            </button>

            {/* Picker dropdown */}
            {showPicker && !pickerMode && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-[var(--border-light)] rounded-xl shadow-lg overflow-hidden w-44">
                <button
                  onClick={() => { setPickerMode("url"); setTimeout(() => urlInputRef.current?.focus(), 50); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:bg-[var(--surface)] transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Website URL
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:bg-[var(--surface)] transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  PDF / Paper
                </button>
                <button
                  onClick={() => { setPickerMode("text"); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-text-secondary hover:bg-[var(--surface)] transition-colors"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>
                  Paste text
                </button>
              </div>
            )}

            {/* URL input mode */}
            {showPicker && pickerMode === "url" && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-[var(--border-light)] rounded-xl shadow-lg p-2.5 w-64">
                <input
                  ref={urlInputRef}
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddUrl(); if (e.key === "Escape") closePicker(); }}
                  placeholder="https://..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] focus:border-[var(--primary-40)] focus:ring-1 focus:ring-[var(--primary-80)] outline-none mb-2"
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button onClick={closePicker} className="flex-1 text-xs py-1.5 rounded-lg border border-[var(--border)] text-text-muted hover:bg-[var(--surface)] transition-colors">Cancel</button>
                  <button onClick={handleAddUrl} className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--primary-40)] text-white hover:bg-[var(--primary-30)] transition-colors">Add</button>
                </div>
              </div>
            )}

            {/* Text paste mode */}
            {showPicker && pickerMode === "text" && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-white border border-[var(--border-light)] rounded-xl shadow-lg p-2.5 w-72">
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] focus:border-[var(--primary-40)] outline-none mb-2"
                  autoFocus
                />
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Escape") closePicker(); }}
                  placeholder="Paste your text, abstract, or notes here..."
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border)] focus:border-[var(--primary-40)] outline-none resize-none mb-2"
                  rows={5}
                />
                <div className="flex gap-1.5">
                  <button onClick={closePicker} className="flex-1 text-xs py-1.5 rounded-lg border border-[var(--border)] text-text-muted hover:bg-[var(--surface)] transition-colors">Cancel</button>
                  <button onClick={handleAddText} disabled={!textInput.trim()} className="flex-1 text-xs py-1.5 rounded-lg bg-[var(--primary-40)] text-white hover:bg-[var(--primary-30)] disabled:opacity-40 transition-colors">Add</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary-90)] flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary-30)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">Chat with your sources</p>
              <p className="text-xs text-text-muted leading-relaxed">
                Ask questions, explore angles, or get writing suggestions
              </p>
            </div>
            <div className="space-y-1.5 w-full">
              {[
                { icon: "🔍", text: "What are the key themes?" },
                { icon: "✏️", text: "Suggest a newsletter angle" },
                { icon: "📋", text: "Summarize the main arguments" },
              ].map((s) => (
                <button
                  key={s.text}
                  onClick={() => {
                    setInput(s.text);
                    inputRef.current?.focus();
                  }}
                  className="w-full text-left text-xs px-3 py-2.5 rounded-xl bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-text-secondary transition-colors flex items-center gap-2.5 border border-transparent hover:border-[var(--border-light)]"
                >
                  <span>{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-[var(--primary-40)] text-white rounded-br-md"
                    : "bg-surface text-text-primary rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div>
                    <div
                      className="prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-text-primary [&_em]:text-text-secondary"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                    <div className="flex justify-end mt-1.5 pt-1.5 border-t border-border-light">
                      <button
                        onClick={() => handleInsertResponse(msg.content)}
                        className="text-[10px] font-medium text-text-muted hover:text-[var(--primary-30)] transition-colors px-1.5 py-0.5 rounded hover:bg-[var(--primary-90)]"
                      >
                        Insert into editor ↵
                      </button>
                    </div>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-surface rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1.5">
                <span
                  className="w-2 h-2 bg-[var(--neutral-50)] rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                />
                <span
                  className="w-2 h-2 bg-[var(--neutral-50)] rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 bg-[var(--neutral-50)] rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-border-light p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              sources.length > 0
                ? "Ask about your sources..."
                : "Add sources first for better answers..."
            }
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-border bg-white focus:border-[var(--primary-40)] focus:ring-1 focus:ring-[var(--primary-80)] outline-none resize-none min-h-[36px] max-h-[120px] leading-relaxed"
            rows={1}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary-40)] text-white flex items-center justify-center hover:bg-[var(--primary-30)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
        <p className="text-[10px] text-text-muted mt-1.5 px-1">
          Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
