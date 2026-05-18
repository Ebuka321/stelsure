import { NextResponse } from "next/server";
import { defaultExplanation } from "@/lib/ai";
import type { Explanation } from "@/lib/types";

type ExplainPayload = {
  rainfall?: string;
  threshold?: string;
  payoutAmount?: string;
  policyId?: string;
};

function fallbackExplanation(fallbackReason: string): Explanation {
  return {
    ...defaultExplanation,
    fallback: true,
    fallbackReason,
  };
}

function extractOutputText(data: unknown) {
  if (typeof data !== "object" || !data) {
    return null;
  }

  if (!("candidates" in data) || !Array.isArray(data.candidates)) {
    return null;
  }

  for (const candidate of data.candidates) {
    if (
      typeof candidate !== "object" ||
      !candidate ||
      !("content" in candidate) ||
      typeof candidate.content !== "object" ||
      !candidate.content ||
      !("parts" in candidate.content) ||
      !Array.isArray(candidate.content.parts)
    ) {
      continue;
    }

    for (const contentItem of candidate.content.parts) {
      if (
        typeof contentItem === "object" &&
        contentItem &&
        "text" in contentItem &&
        typeof contentItem.text === "string"
      ) {
        return contentItem.text;
      }
    }
  }

  return null;
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ExplainPayload;
  const apiKey =
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_AI_API_KEY ??
    process.env.GOOGLE_AI_STUDIO_API_KEY ??
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(fallbackExplanation("AI explanation is not configured on the server."));
  }

  if (!apiKey.startsWith("AIza")) {
    console.error("Gemini API key is configured, but it does not look like a Google AI Studio key.");
    return NextResponse.json(fallbackExplanation("AI explanation is misconfigured on the server."));
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text:
                  `Explain this StelSure payout event for a farmer dashboard. Rainfall: ${payload.rainfall ?? "unknown"} mm. Threshold: ${payload.threshold ?? "100"} mm. Payout: ${payload.payoutAmount ?? "0"} stroops. Policy ID: ${payload.policyId ?? "unknown"}.`,
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          response_json_schema: {
            type: "object",
            properties: {
              label: { type: "string" },
              severity: { type: "string", enum: ["Low", "Medium", "High"] },
              reason: { type: "string" },
            },
            required: ["label", "severity", "reason"],
          },
        },
        systemInstruction: {
          parts: [
            {
              text:
                "Return compact JSON with keys label, severity, reason. Severity must be Low, Medium, or High. Keep the reason under 30 words.",
            },
          ],
        },
      }),
    },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini request failed with ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const outputText = extractOutputText(data);
    if (!outputText) {
      throw new Error("Gemini response did not include output text.");
    }

    const parsed = JSON.parse(outputText) as {
      label: string;
      severity: "Low" | "Medium" | "High";
      reason: string;
    };

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to generate AI explanation", error);
    return NextResponse.json(fallbackExplanation("AI explanation is temporarily unavailable."));
  }
}
