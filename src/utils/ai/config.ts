import { Type } from "@google/genai";
import { readFile } from "fs/promises";
import { jobClassificationSchema } from "./types.js";

export const aiModel = {
    model: "gemini-2.5-flash-lite-preview-06-17",
    cost: {
        inputTokenPerMillion: 0.10,
        cacheTokenPerMillion: 0.025,
        outputTokenPerMillion: 0.40,
        cacheStorePerMillionHour: 1,
    }
}

export async function buildAIPrompt(): Promise<string> {
    const customAIRules = await readFile('./AI-RULES.md', 'utf8');
    return `You are a job title classification expert. For each job title provided, extract: ID (from input), Job Function (from enum), Job Seniority (from enum), Confidence (0 to 1), and Standardized Job Title. ${customAIRules}`;
}

export function getAIConfiguration(cacheId: string) {
    return {
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            required: ["classifications"],
            properties: {
                classifications: {
                    type: Type.ARRAY,
                    items: jobClassificationSchema,
                },
            },
        },
        cachedContent: cacheId,
    };
}