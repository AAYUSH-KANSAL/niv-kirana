import { describe, expect, it } from "vitest";

import { extractLlmText, parseLlmJsonObject } from "../shared/llm-response";

describe("LLM response parsing", () => {
  it("extracts text from a normal assistant response", () => {
    expect(extractLlmText('{"productName":"Rajma"}')).toBe('{"productName":"Rajma"}');
  });

  it("extracts text from a text content array", () => {
    expect(extractLlmText([{ type: "text", text: "{\"productName\":\"Rajma\"}" }])).toBe('{"productName":"Rajma"}');
  });

  it("parses fenced JSON and ignores invalid content", () => {
    expect(parseLlmJsonObject("```json\n{\"productName\":\"Detox Facewash\"}\n```")).toEqual({ productName: "Detox Facewash" });
    expect(parseLlmJsonObject("not json")).toBeNull();
  });
});
