import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

interface SourceInput {
  type: "link" | "text" | "pdf";
  title: string;
  url?: string;
  content?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages, sources } = (await request.json()) as {
      messages: Message[];
      sources: SourceInput[];
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Build source context
    // PDF/text content is truncated to ~4000 chars each to stay within context limits
    const sourceContext =
      sources && sources.length > 0
        ? sources
            .map((s, i) => {
              if (s.type === "link") {
                return `Source ${i + 1} [Website]: "${s.title}" — ${s.url}`;
              }
              if (s.type === "pdf") {
                return `Source ${i + 1} [PDF]: "${s.title}"\n${s.content?.substring(0, 4000) ?? ""}`;
              }
              // text
              return `Source ${i + 1} [Text]: "${s.title}"\n${s.content?.substring(0, 4000) ?? ""}`;
            })
            .join("\n\n")
        : "No sources have been added yet.";

    // Build conversation history for context
    const conversationHistory = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n\n");

    const prompt = `You are NoteCraft AI, a helpful writing assistant for newsletter creators. You help users explore their sources, find angles, and craft their newsletter.

SOURCES:
${sourceContext}

CONVERSATION:
${conversationHistory}

Respond to the user's latest message. Be concise and helpful. If they ask about their sources, reference specific information. If they ask for writing help, give concrete suggestions. Keep responses under 150 words unless they ask for something longer. Use markdown formatting sparingly (bold for emphasis, bullet points for lists).`;

    const result = await callGemini({
      prompt,
      maxTokens: 1024,
    });

    return NextResponse.json({ content: result });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate response" },
      { status: 500 }
    );
  }
}
