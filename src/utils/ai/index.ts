import { ApiError, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { logger } from "../logger.js";
import { aiModel, getAIConfiguration } from "./config.js";
import { AIResponse, JobClassification, JobTitleInput } from "./types.js";
import { calculateAICost, processClassifications, validateAIResponse } from "./utils.js";

export { ApiError, GenerateContentResponse, GoogleGenAI } from "@google/genai";
export * from "./cache.js";
export * from "./config.js";
export * from "./initialize.js";
export * from "./types.js";
export * from "./utils.js";

export async function classifyJobTitles(jobs: JobTitleInput[], ai: GoogleGenAI, cacheId: string): Promise<AIResponse> {
    const generationConfig = getAIConfiguration(cacheId);

    let response: GenerateContentResponse;
    let currentCost = 0;

    try {
        logger.info(`Generating AI response for ${jobs.length} items...`);
        const startTime = Date.now();
        response = await ai.models.generateContent({
            model: aiModel.model,
            config: generationConfig,
            contents: [{ role: "user", parts: [{ text: JSON.stringify(jobs) }] }]
        });
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;
        logger.info(`AI response generated ${jobs.length} items in ${elapsedTime / 1000} seconds`);
    } catch (error) {
        const errorMessage = error instanceof ApiError ? `AI error: ${error.name}: ${error.message}` : `An unknown error occurred: ${error}`;
        logger.error(errorMessage);
        return { classifications: [], cost: 0, status: 'error', error: errorMessage };
    }

    currentCost = calculateAICost(response.usageMetadata);

    const aiResult = JSON.parse(response.text || "{}");
    const classificationsResult = aiResult.classifications as Omit<JobClassification, "standardizedJobTitle" | "cost">[];

    const validationError = validateAIResponse(jobs, classificationsResult);
    if (validationError) {
        logger.error(validationError);
        return { classifications: [], cost: currentCost, status: 'mismatch_error', error: validationError };
    }

    const classifications = processClassifications(jobs, classificationsResult, currentCost);

    return { classifications, cost: currentCost, status: 'success' };
}