"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface SlashCommand {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { id: "image", label: "Image", icon: "🎨", description: "Generate an AI image" },
  { id: "summarize", label: "Summarize", icon: "📋", description: "Summarize from sources" },
  { id: "quote", label: "Quote", icon: "💬", description: "Pull a quote from sources" },
];

interface EditorProps {
  content: string;
  onContentChange: (content: string) => void;
  onSlashCommand: (commandId: string) => void;
  onSmartPaste: (url: string) => void;
}

export default function Editor({
  content,
  onContentChange,
  onSlashCommand,
  onSmartPaste,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showPalette, setShowPalette] = useState(false);
  const [paletteFilter, setPaletteFilter] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [palettePosition, setPalettePosition] = useState({ top: 0, left: 0 });
  const [showPasteToast, setShowPasteToast] = useState<string | null>(null);
  const slashPositionRef = useRef<number | null>(null);

  const filteredCommands = SLASH_COMMANDS.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(paletteFilter.toLowerCase()) ||
      cmd.id.toLowerCase().includes(paletteFilter.toLowerCase())
  );

  // Count words
  const wordCount = content
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  const getCaretCoords = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return { top: 0, left: 0 };

    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(false);

    const rect = range.getClientRects()[0];
    if (!rect) {
      // Fallback to editor position
      const editor = editorRef.current;
      if (!editor) return { top: 0, left: 0 };
      const editorRect = editor.getBoundingClientRect();
      return { top: editorRect.top + 20, left: editorRect.left + 20 };
    }

    return { top: rect.bottom + 4, left: rect.left };
  }, []);

  const dismissPalette = useCallback(() => {
    setShowPalette(false);
    setPaletteFilter("");
    setSelectedIndex(0);
    slashPositionRef.current = null;
  }, []);

  const executeCommand = useCallback(
    (cmd: SlashCommand) => {
      // Remove the slash text from the editor
      if (editorRef.current && slashPositionRef.current !== null) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const textNode = range.startContainer;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const text = textNode.textContent || "";
            const slashIndex = text.lastIndexOf("/");
            if (slashIndex >= 0) {
              textNode.textContent = text.substring(0, slashIndex);
              // Reset cursor
              const newRange = document.createRange();
              newRange.setStart(textNode, Math.min(slashIndex, textNode.textContent?.length || 0));
              newRange.collapse(true);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }
          }
        }
      }

      dismissPalette();
      onSlashCommand(cmd.id);
    },
    [dismissPalette, onSlashCommand]
  );

  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    onContentChange(html);

    // Check for slash command trigger
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    if (textNode.nodeType !== Node.TEXT_NODE) return;

    const text = textNode.textContent || "";
    const cursorPos = range.startOffset;
    const textBeforeCursor = text.substring(0, cursorPos);

    // Find the last "/" that's either at the start or after a space/newline
    const slashMatch = textBeforeCursor.match(/(?:^|\s)\/([\w]*)$/);

    if (slashMatch) {
      const filter = slashMatch[1];
      setPaletteFilter(filter);
      setSelectedIndex(0);
      slashPositionRef.current = cursorPos - filter.length - 1;

      const coords = getCaretCoords();
      setPalettePosition(coords);
      setShowPalette(true);
    } else if (showPalette) {
      dismissPalette();
    }
  }, [onContentChange, showPalette, getCaretCoords, dismissPalette]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showPalette) return;

      if (e.key === "Escape") {
        e.preventDefault();
        dismissPalette();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter" && filteredCommands.length > 0) {
        e.preventDefault();
        executeCommand(filteredCommands[selectedIndex]);
        return;
      }
    },
    [showPalette, filteredCommands, selectedIndex, dismissPalette, executeCommand]
  );

  // Smart paste: detect URLs being pasted
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const text = e.clipboardData.getData("text/plain");

      // Check if pasted text is a URL
      if (/^https?:\/\/\S+$/i.test(text.trim())) {
        // Show toast offering to add as source
        setShowPasteToast(text.trim());
        // Still paste the URL into the editor
      }
    },
    []
  );

  // Auto-dismiss paste toast
  useEffect(() => {
    if (showPasteToast) {
      const timer = setTimeout(() => setShowPasteToast(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [showPasteToast]);

  const handleAddAsSource = useCallback(() => {
    if (showPasteToast) {
      onSmartPaste(showPasteToast);
      setShowPasteToast(null);
    }
  }, [showPasteToast, onSmartPaste]);

  // Set initial content
  useEffect(() => {
    if (editorRef.current && content && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [content]);

  // Insert content at cursor (exposed via insertAtCursor function)
  const insertAtCursor = useCallback((html: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Append at end if no cursor
      editorRef.current.innerHTML += html;
    } else {
      const range = selection.getRangeAt(0);
      range.deleteContents();

      const temp = document.createElement("div");
      temp.innerHTML = html;
      const fragment = document.createDocumentFragment();
      while (temp.firstChild) {
        fragment.appendChild(temp.firstChild);
      }
      range.insertNode(fragment);

      // Move cursor after inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // Trigger content change
    onContentChange(editorRef.current.innerHTML);
  }, [onContentChange]);

  // Expose insertAtCursor via a ref-like pattern
  useEffect(() => {
    if (editorRef.current) {
      (editorRef.current as HTMLDivElement & { insertAtCursor?: (html: string) => void }).insertAtCursor = insertAtCursor;
    }
  }, [insertAtCursor]);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Editor area */}
      <div className="flex-1 overflow-y-auto px-8 md:px-16 lg:px-24 py-8">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="min-h-[calc(100vh-180px)] text-[var(--neutral-10)] leading-relaxed text-base focus:outline-none prose prose-sm max-w-none"
          style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          data-placeholder="Start writing your newsletter... Type / for commands"
        />
      </div>

      {/* Word count */}
      <div className="shrink-0 px-6 py-2 border-t border-border-light flex items-center justify-between">
        <span className="text-xs text-text-muted">{wordCount} words</span>
        <span className="text-xs text-text-muted">
          {content ? "Saved" : "Start typing..."}
        </span>
      </div>

      {/* Slash command palette */}
      {showPalette && filteredCommands.length > 0 && (
        <div
          className="fixed z-50 animate-fade-in-up"
          style={{
            top: `${palettePosition.top}px`,
            left: `${palettePosition.left}px`,
          }}
        >
          <div className="bg-white rounded-xl shadow-lg border border-border py-1.5 min-w-[220px]">
            <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Commands
            </div>
            {filteredCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-surface transition-colors ${
                  i === selectedIndex ? "bg-surface" : ""
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  executeCommand(cmd);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="text-lg">{cmd.icon}</span>
                <div>
                  <span className="text-sm font-medium text-text-primary">{cmd.label}</span>
                  <span className="text-xs text-text-muted block">{cmd.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Smart paste toast */}
      {showPasteToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="bg-[var(--neutral-10)] text-white rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-md">
            <span className="text-sm">🔗</span>
            <p className="text-sm flex-1 truncate">Add as source?</p>
            <button
              onClick={handleAddAsSource}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-[var(--primary-40)] hover:bg-[var(--primary-30)] text-white shrink-0"
            >
              Add Source
            </button>
            <button
              onClick={() => setShowPasteToast(null)}
              className="text-xs text-[var(--neutral-60)] hover:text-white shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        [data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: var(--neutral-60);
          pointer-events: none;
          display: block;
        }
      `}</style>
    </div>
  );
}
