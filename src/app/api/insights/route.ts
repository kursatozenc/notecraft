import { NextRequest, NextResponse } from "next/server";
import { callGemini } from "@/lib/gemini";

interface SourceInput {
  type: "link" | "text";
  title: string;
  url?: string;
  content?: string;
}

const INSIGHTS_SCHEMA = {
  type: "OBJECT",
  properties: {
    quotes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          source: { type: "STRING" },
        },
        required: ["text", "source"],
      },
    },
    summaries: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          text: { type: "STRING" },
          tags: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["text", "tags"],
      },
    },
    themes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          description: { type: "STRING" },
        },
        required: ["name", "description"],
      },
    },
  },
  required: ["quotes", "summaries", "themes"],
};

export async function POST(request: NextRequest) {
  try {
    const { sources } = (await request.json()) as { sources: SourceInput[] };

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: "No sources provided" }, { status: 400 });
    }

    // Build source descriptions for the prompt
    const sourceDescriptions = sources
      .map((s, i) => {
        if (s.type === "link") {
          return `Source ${i + 1} [Link]: "${s.title}" — ${s.url}`;
        }
        return `Source ${i + 1} [Text]: "${s.title}" — ${s.content?.substring(0, 500)}`;
      })
      .join("\n");

    const prompt = `You are an AI writing assistant helping a newsletter creator. Analyze these sources and extract useful insights.

SOURCES:
${sourceDescriptions}

Based on these sources, provide:
1. **quotes**: 2-3 notable quotes or key statements that would be compelling in a newsletter. Each should be a concise, impactful statement. For each quote, note which source it came from.
2. **summaries**: 2-3 key takeaway summaries that synthesize the main ideas. Each summary should be 1-2 sentences. Add 1-3 topic tags per summary.
3. **themes**: 2-3 overarching themes or patterns that emerge from the sources. Each theme should have a short name and 1-sentence description.

Be concise, insightful, and focused on what would be useful for a newsletter writer. If sources are URLs without content, make reasonable inferences from the domain and title.`;

    const result = await callGemini({
      prompt,
      jsonSchema: INSIGHTS_SCHEMA,
    });

    const insights = JSON.parse(result);
    return NextResponse.json(insights);
  } catch (error) {
    console.error("Insights API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate insights" },
      { status: 500 }
    );
  }
}
