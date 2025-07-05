import { GoogleGenAI } from '@google/genai';
import { addMinutes } from 'date-fns';
import { aiModel, buildAIPrompt } from './config.js';

export async function createAICache(ai: GoogleGenAI, expireTime: Date = addMinutes(new Date(), 5)): Promise<{ cacheId: string; cacheExpiration: Date }> {
    const prompt = await buildAIPrompt();
    const cacheRes = await ai.caches.create({
        model: aiModel.model,
        config: {
            displayName: "Job Title AI",
            systemInstruction: prompt,
            expireTime: expireTime.toISOString(),
        }
    });
    const cacheId = cacheRes.name as string;
    const cacheExpiration = new Date(cacheRes.expireTime as string);
    return { cacheId, cacheExpiration };
}

export async function extendAICache(ai: GoogleGenAI, cacheId: string, cacheExpiration: Date): Promise<{ cacheExpiration: Date }> {
    const cacheRes = await ai.caches.update({
        name: cacheId,
        config: {
            expireTime: cacheExpiration.toISOString(),
        }
    });
    cacheExpiration = new Date(cacheRes.expireTime as string);
    return { cacheExpiration };
}