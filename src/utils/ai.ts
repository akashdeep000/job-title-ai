import { ErrorDetails, GenerateContentResult, GenerativeModel, GoogleGenerativeAI, SchemaType, type GenerateContentRequest, type GenerationConfig, type Schema } from "@google/generative-ai";
import { readFile } from "fs/promises";
import { getStandardizedJobTitle } from "./standardize.js";

let ai: GoogleGenerativeAI;

function getAiClient() {
    if (!ai) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY environment variable is not set.");
        }
        ai = new GoogleGenerativeAI(apiKey);
    }
    return ai;
}

export interface JobTitleInput {
    id: string;
    job_title: string;
}

export interface JobClassification {
    id: string;
    jobFunction: string;
    jobSeniority: string;
    confidence: number;
    standardizedJobTitle: string;
}

// Define the schema for a single job classification object
const jobClassificationSchema: Schema = {
    type: SchemaType.OBJECT,
    required: ["id", "jobFunction", "jobSeniority", "confidence", "standardizedJobTitle"],
    properties: {
        id: { type: SchemaType.STRING },
        jobFunction: {
            type: SchemaType.STRING,
            enum: [
                "Executive Decision Maker",
                "Finance",
                "Product",
                "Sales",
                "Customer success",
                "HR",
                "Marketing",
                "Communications",
                "Support",
                "Software Development",
                "Information Technology",
                "Manufacturing",
                "Engineering",
                "Logistics",
                "Operations",
                "Property Management",
                "Development",
                "Legal",
                "Sustainability",
                "HSEQ",
                "Project Management",
                "Other Commercial",
                "Administration",
                "Other"
            ],
            format: "enum", // Explicitly define format as "enum"
        },
        jobSeniority: {
            type: SchemaType.STRING,
            enum: [
                "CEO",
                "Chief",
                "Managing Director",
                "Chairman of the Board",
                "Entrepreneur",
                "Founder",
                "Vice President",
                "President",
                "Director",
                "Head of",
                "Manager",
                "Lead",
                "Partner",
                "Executive",
                "Other"
            ],
            format: "enum", // Explicitly define format as "enum"
        },
        confidence: { type: SchemaType.NUMBER },
        standardizedJobTitle: { type: SchemaType.STRING },
    },
};

// Define the overall response schema for an array of classifications
const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
    responseSchema: {
        type: SchemaType.OBJECT,
        required: ["classifications"],
        properties: {
            classifications: {
                type: SchemaType.ARRAY,
                items: jobClassificationSchema,
            },
        },
    },
};

async function buildAIPrompt(jobs: JobTitleInput[]): Promise<string> {
    const customAIRules = await readFile('./AI-RULES.md', 'utf8');
    const titlesList = jobs.map(job => `- ID: ${job.id}, Title: "${job.job_title}"`).join("\n");
    return `You are a job title classification expert.
For each job title provided, extract:
- ID (from input)
- Job Function (from enum)
- Job Seniority (from enum)
- Confidence (0 to 1)
- Standardized Job Title

⚠️ VERY IMPORTANT RULES:
- You MUST return exactly one JSON object per input row.
- Do NOT skip rows, even if the title is unclear.
- If uncertain, use 'Other' for both jobFunction and jobSeniority with low confidence.
- Always echo the original 'id' field for each row, no changes.
${customAIRules}

Job Titles to classify:
${titlesList}`;
}

export async function classifyJobTitles(jobs: JobTitleInput[]): Promise<JobClassification[]> {
    const aiClient = getAiClient();
    const model: GenerativeModel = aiClient.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-06-17", generationConfig });

    const request: GenerateContentRequest = {
        contents: [
            {
                role: "user",
                parts: [{ text: await buildAIPrompt(jobs) }],
            },
        ],
    };

    let result: GenerateContentResult;
    try {
        result = await model.generateContent(request);
    } catch (e) {
        const error = e as ErrorDetails
        throw new Error(`AI error: ${error.reason ?? error.message}`);
    }
    const response = result.response;
    const responseText = response.text();

    const inputTokenCount = result.response.usageMetadata?.promptTokenCount;
    const outputTokenCount = result.response.usageMetadata?.candidatesTokenCount;
    console.log(`Input Token Count: ${inputTokenCount}`);
    console.log(`Output Token Count: ${outputTokenCount}`);
    if (inputTokenCount && outputTokenCount) {
        console.log(`Total Token Count: ${inputTokenCount + outputTokenCount}`);
    }

    const aiResult = JSON.parse(responseText);
    const classifications = aiResult.classifications as Omit<JobClassification, "standardizedJobTitle">[];

    if (!classifications || classifications.length !== jobs.length) {
        throw new Error("AI response classification count mismatch.");
    }
    const inputIds = new Set(jobs.map(job => job.id));
    const outputIds = new Set(classifications.map(c => c.id));

    if (inputIds.size !== outputIds.size || ![...inputIds].every(id => outputIds.has(id))) {
        throw new Error("AI response classification ID mismatch.");
    }
    return classifications.map(c => ({
        ...c,
        standardizedJobTitle: getStandardizedJobTitle(c.jobSeniority, c.jobFunction, jobs.find(j => j.id === c.id)?.job_title)
    }));
}