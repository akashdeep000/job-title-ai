import { GenerativeModel, GoogleGenerativeAI, SchemaType, type GenerateContentRequest, type GenerationConfig, type Schema } from "@google/generative-ai";

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
}

// Define the schema for a single job classification object
const jobClassificationSchema: Schema = {
    type: SchemaType.OBJECT,
    required: ["id", "jobFunction", "jobSeniority", "confidence"],
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

function buildAIPrompt(jobs: JobTitleInput[]): string {
    const titlesList = jobs.map(job => `- ID: ${job.id}, Title: "${job.job_title}"`).join("\n");
    return `You are a job title classification expert.
For each job title provided, extract:
- ID (from input)
- Job Function (from enum)
- Job Seniority (from enum)
- Confidence (0 to 1)

Return the original ID for each classification.

Enums:
Job Functions: ["Executive Decision Maker", "Finance", "Product", "Sales", "Customer success", "HR", "Marketing", "Communications", "Support", "Software Development", "Information Technology", "Manufacturing",
"Engineering", "Logistics", "Operations", "Property Management", "Development", "Legal", "Sustainability", "HSEQ", "Project Management", "Other Commercial", "Administration", "Other"]

Job Seniority: ["CEO", "Chief", "Managing Director", "Chairman of the Board", "Entrepreneur", "Founder",
"Vice President", "President", "Director", "Head of", "Manager", "Lead", "Partner", "Executive", "Other"]

Be cautious of misleading employer names.

Job Titles to classify:
${titlesList}`;
}

async function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    delayMs: number,
    attempt = 1
): Promise<T | null> {
    try {
        return await fn();
    } catch (error) {
        if (attempt <= maxRetries) {
            console.warn(`Attempt ${attempt} failed. Retrying in ${delayMs}ms...`, error);
            await sleep(delayMs);
            return retry(fn, maxRetries, delayMs * 2, attempt + 1); // Exponential backoff
        } else {
            console.error(`Max retries (${maxRetries}) exceeded. Failed to execute function.`, error);
            return null;
        }
    }
}

export async function classifyJobTitles(jobs: JobTitleInput[]): Promise<JobClassification[] | null> {
    const aiClient = getAiClient();
    const model: GenerativeModel = aiClient.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17", generationConfig });

    const request: GenerateContentRequest = {
        contents: [
            {
                role: "user",
                parts: [{ text: buildAIPrompt(jobs) }],
            },
        ],
    };

    const classifyAttempt = async (): Promise<JobClassification[] | null> => {
        try {
            const result = await model.generateContent(request);
            const response = result.response;
            const responseText = response.text();

            const aiResult = JSON.parse(responseText);
            const classifications = aiResult.classifications as JobClassification[];

            if (!classifications || classifications.length !== jobs.length) {
                console.warn(`AI response mismatch: Expected ${jobs.length} classifications, got ${classifications ? classifications.length : 0}.`);
                throw new Error("AI response classification count mismatch.");
            }
            return classifications;
        } catch (err) {
            // Re-throw to be caught by the retry mechanism
            throw err;
        }
    };

    const classifications = await retry(classifyAttempt, 3, 1000); // 3 retries, starting with 1 second delay

    if (!classifications) {
        console.error(`Failed to classify job titles after multiple retries for batch starting with: "${jobs[0].job_title}"`);
        return null;
    }

    return classifications;
}