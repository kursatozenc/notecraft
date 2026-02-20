"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Source } from "@/hooks/useLocalDraft";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  sources: Source[];
  onInsert: (html: string) => void;
  initialMessages?: Message[];
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

export default function ChatPanel({ sources, onInsert, initialMessages }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Reset messages when demo is dismissed (initialMessages becomes undefined)
  useEffect(() => {
    if (!initialMessages) {
      setMessages([]);
    }
  }, [initialMessages]);

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
        {sources.length > 0 && (
          <p className="text-[10px] text-text-muted mt-1.5 px-1">
            {sources.length} source{sources.length !== 1 ? "s" : ""} loaded • Shift+Enter for new line
          </p>
        )}
      </div>
    </div>
  );
}
