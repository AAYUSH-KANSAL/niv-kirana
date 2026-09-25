export function extractLlmText(content: unknown): string | null {
  if (typeof content === "string") return content.trim() || null;
  if (!Array.isArray(content)) return null;

  const text = content.flatMap((part) => {
    if (!part || typeof part !== "object") return [];
    const candidate = part as { type?: unknown; text?: unknown };
    return candidate.type === "text" && typeof candidate.text === "string" ? [candidate.text] : [];
  }).join("\n").trim();
  return text || null;
}

export function parseLlmJsonObject(content: unknown): Record<string, unknown> | null {
  const text = extractLlmText(content);
  if (!text) return null;

  const candidates = [
    text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim(),
    text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1),
  ].filter((candidate, index, all) => candidate && all.indexOf(candidate) === index);

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      // Try the next safe candidate, then let the caller use its fallback.
    }
  }
  return null;
}
