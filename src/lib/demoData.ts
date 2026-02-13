import { Source, Draft } from "@/hooks/useLocalDraft";
import { Insights } from "@/components/InsightsPanel";

// ─── Demo Sources ────────────────────────────────────────────────────

export const DEMO_SOURCES: Source[] = [
  {
    id: "demo-src-1",
    type: "link",
    title: "AI-Augmented Design: A New Framework",
    url: "https://nngroup.com/articles/ai-augmented-design",
  },
  {
    id: "demo-src-2",
    type: "text",
    title: "Human-AI Collaboration in Creative Work",
    content:
      "The most effective creative partnerships between humans and AI emerge when designers treat AI as a divergent thinking tool rather than a replacement for human judgment. Studies show that teams using AI for ideation generate 3x more concepts in the same timeframe, but the quality filter still requires human expertise. The key insight: AI excels at breadth, humans excel at depth.",
  },
  {
    id: "demo-src-3",
    type: "link",
    title: "The State of AI in Product Design 2025",
    url: "https://designsystems.io/ai-product-design-report",
  },
];

// ─── Demo Draft ──────────────────────────────────────────────────────

export const DEMO_DRAFT: Draft = {
  title: "The AI-Augmented Designer",
  content: `<p style="margin: 12px 0;">This week I've been thinking about something that keeps coming up in conversations with design leads: <strong>the role of AI isn't to replace the designer's eye — it's to multiply it.</strong></p>
<p style="margin: 12px 0;">Every tool we've adopted in design — from Photoshop to Figma — changed <em>what</em> we could do, but AI is changing <em>how fast we can think</em>. That's a fundamentally different kind of shift.</p>
<blockquote style="border-left: 3px solid var(--accent-50); padding-left: 12px; margin: 12px 0; color: var(--neutral-30); font-style: italic;">"Teams using AI for ideation generate 3x more concepts in the same timeframe, but the quality filter still requires human expertise."<br><small style="color: var(--neutral-50);">— Human-AI Collaboration in Creative Work</small></blockquote>
<p style="margin: 12px 0;">So what does this mean for newsletter creators and design thinkers? Let's dig in...</p>`,
  sources: DEMO_SOURCES,
};

// ─── Demo Insights (pre-computed, no API call) ───────────────────────

export const DEMO_INSIGHTS: Insights = {
  quotes: [
    {
      text: "Teams using AI for ideation generate 3x more concepts in the same timeframe, but the quality filter still requires human expertise.",
      source: "Human-AI Collaboration in Creative Work",
    },
    {
      text: "AI excels at breadth, humans excel at depth.",
      source: "Human-AI Collaboration in Creative Work",
    },
    {
      text: "The most effective creative partnerships emerge when designers treat AI as a divergent thinking tool.",
      source: "Human-AI Collaboration in Creative Work",
    },
  ],
  summaries: [
    {
      text: "AI tools are transforming the design process by accelerating ideation and exploration, but human judgment remains essential for quality and strategic decisions.",
      tags: ["AI", "Design Process", "Creativity"],
    },
    {
      text: "The emerging framework treats AI as a 'breadth multiplier' — generating more options faster — while humans serve as the 'depth filter' for taste, context, and strategic alignment.",
      tags: ["Human-AI Collaboration", "Framework"],
    },
  ],
  themes: [
    {
      name: "AI as Multiplier, Not Replacement",
      description:
        "The consistent finding across sources is that AI augments creative capacity rather than substituting for human expertise.",
    },
    {
      name: "Breadth vs. Depth",
      description:
        "A recurring pattern: AI handles divergent exploration while humans handle convergent selection and refinement.",
    },
    {
      name: "Speed of Thinking",
      description:
        "Unlike previous tools that changed what designers could do, AI changes how fast they can iterate on ideas.",
    },
  ],
};

// ─── Demo Chat Messages ──────────────────────────────────────────────

export interface DemoMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export const DEMO_CHAT_MESSAGES: DemoMessage[] = [
  {
    id: "demo-msg-1",
    role: "user",
    content: "What are the key themes across my sources?",
  },
  {
    id: "demo-msg-2",
    role: "assistant",
    content:
      "Based on your sources, three themes stand out:\n\n- **AI as a Multiplier**: The sources consistently frame AI as augmenting human creativity rather than replacing it. The NN/g article emphasizes AI-*augmented* design specifically.\n\n- **Breadth vs. Depth**: Your text source captures this perfectly — AI generates more options faster, but humans still provide the quality filter. This is a compelling framework for your newsletter.\n\n- **A New Kind of Tool Shift**: Previous tools changed *what* designers could do. AI changes *how fast they can think*. This is a great hook for your intro.\n\nWant me to suggest a newsletter angle based on these themes?",
  },
];
