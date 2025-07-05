import { GenerateContentResponse } from "@google/genai";
import { getStandardizedJobTitle } from "../helper.js";
import { aiModel } from "./config.js";
import { JobClassification, JobTitleInput } from "./types.js";

export function calculateAICost(usageMetadata: GenerateContentResponse['usageMetadata']): number {
    if (!usageMetadata) return 0;
    const { promptTokenCount, cachedContentTokenCount = 0, candidatesTokenCount } = usageMetadata;

    if (promptTokenCount && candidatesTokenCount) {
        const inputTokenCountWithoutCache = promptTokenCount - cachedContentTokenCount;
        const cost1 = (inputTokenCountWithoutCache / 1000000) * aiModel.cost.inputTokenPerMillion;
        const cost2 = (cachedContentTokenCount / 1000000) * aiModel.cost.cacheTokenPerMillion;
        const cost3 = (candidatesTokenCount / 1000000) * aiModel.cost.outputTokenPerMillion;
        return cost1 + cost2 + cost3;
    }
    return 0;
}

export function validateAIResponse(jobs: JobTitleInput[], classificationsResult: Omit<JobClassification, "standardizedJobTitle" | "cost">[]): string | null {
    if (!classificationsResult || classificationsResult.length !== jobs.length) {
        return "AI response classification count mismatch.";
    }

    const inputIds = new Set(jobs.map(job => job.id));
    const outputIds = new Set(classificationsResult.map(c => c.id));

    if (inputIds.size !== outputIds.size || ![...inputIds].every(id => outputIds.has(id))) {
        return "AI response classification ID mismatch.";
    }
    return null;
}

export function processClassifications(
    jobs: JobTitleInput[],
    classificationsResult: Omit<JobClassification, "standardizedJobTitle" | "cost">[],
    currentCost: number
): JobClassification[] {
    const costPerClassification = classificationsResult.length > 0 ? currentCost / classificationsResult.length : 0;
    return classificationsResult.map(c => ({
        ...c,
        standardizedJobTitle: getStandardizedJobTitle(c.jobSeniority, c.jobFunction, jobs.find(j => j.id === c.id)?.jobTitle),
        cost: costPerClassification,
    }));
}