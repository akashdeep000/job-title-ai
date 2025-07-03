import { ErrorDetails, GenerateContentResult, GenerativeModel, GoogleGenerativeAI, SchemaType, type GenerateContentRequest, type GenerationConfig, type Schema } from "@google/generative-ai";
import { readFile } from "fs/promises";
import { getStandardizedJobTitle } from "./standardize.js";

const aiModel = {
    model: "gemini-2.5-flash-preview-04-17",
    cost: {
        inputTokenPerMillion: 0.15,
        outputTokenPerMillion: 0.60,
    }
}

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
    // const titlesList = jobs.map(job => `- ID: ${job.id}, Title: "${job.job_title}"`).join("\n");
    return `You are a job title classification expert.
For each job title provided, extract:
- ID (from input)
- Job Function (from enum)
- Job Seniority (from enum)
- Confidence (0 to 1)
- Standardized Job Title

Previously i used this twow sql functions to get job function and seniority from job title but as it was not working well without sementic meaning of job title i decided to use AI to do it.

-- Previous function to get job function from job title
CREATE OR REPLACE FUNCTION clevenio_database.get_job_function(job_title text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF job_title IS NULL THEN
        RETURN NULL;
    END IF;
    -- Convert to lowercase for case-insensitive matching
    job_title := lower(job_title);
    -- Executive Decision Maker
    IF job_title ~ ANY(ARRAY['ceo', 'chief executive officer', 'toimitusjohtaja', 'deputy ceo', 'managing director', 'chairman', 'entrepreneur', 'founder', 'co-founder', 'chief operating officer']) THEN
        RETURN 'Executive Decision Maker';
    ELSIF job_title = 'tj' THEN
        RETURN 'Executive Decision Maker';
        -- Other
    ELSIF job_title ~ ANY(ARRAY['telecommunications', 'journalist', 'student']) THEN
        RETURN 'Other';
        -- Finance
    ELSIF job_title ~ ANY(ARRAY['chief financial officer', 'cfo', 'finance', 'financial', 'finanssi', 'controller', 'talous', 'banking', 'tax', 'vero', 'taloushallinto', 'accountant', 'accounting', 'accounts payable', 'account payable']) THEN
        RETURN 'Finance';
        -- Product
    ELSIF job_title ~ ANY(ARRAY['product manager']) THEN
        RETURN 'Product';
        -- Sales
    ELSIF job_title ~ ANY(ARRAY['account executive', 'cso', 'chief sales officer', 'sales', 'myynti', 'myyjä', 'cco', 'chief customer officer', 'commercial', 'kaupallinen', 'revenue', 'cro', 'chief commercial officer', 'chief revenue officer']) THEN
        RETURN 'Sales';
        -- Customer success
    ELSIF job_title ~ ANY(ARRAY['customer success', 'account', 'asiakkuus']) THEN
        RETURN 'Customer success';
        -- HR
    ELSIF job_title ~ ANY(ARRAY['chief human resources officer', 'chro', 'henkilöstö', 'human resources', 'people', 'recruitment', 'human', 'talent', 'recruiting', 'rekrytointi', 'kulttuuri', 'culture', 'hr business partner']) THEN
        RETURN 'HR';
        -- Marketing
    ELSIF job_title ~ ANY(ARRAY['chief marketing officer', 'cmo', 'marketing', 'markkinointi', 'ads', 'mainonta', 'content', 'sisältö']) THEN
        RETURN 'Marketing';
        -- Communications
    ELSIF job_title ~ ANY(ARRAY['communications', 'viestintä', 'chief communications officer', 'brand', 'brändi']) THEN
        RETURN 'Communications';
        -- Support
    ELSIF job_title ~ ANY(ARRAY['support', 'customer service']) THEN
        RETURN 'Support';
        -- Software Development
    ELSIF job_title ~ ANY(ARRAY['chief technical officer', 'chief technology officer', 'chief information officer', 'chief development officer', 'software development', 'developer', 'software', 'technology', 'ohjelmistokehitys', 'ohjelmisto', 'frontend', 'backend', 'automation']) THEN
        RETURN 'Software Development';
        -- Information technology
    ELSIF job_title ~ ANY(ARRAY['cdo', 'cio', 'information', 'informaatio', 'tietohallinto', 'security', 'data', 'IT service', 'digital']) THEN
        RETURN 'Information Technology';
        -- Manufacturing
    ELSIF job_title ~ ANY(ARRAY['production', 'tuotanto', 'plant', 'kunnossapito', 'maintenance', 'factory']) THEN
        RETURN 'Manufacturing';
        -- Product
    ELSIF job_title ~ ANY(ARRAY['product', 'tuote']) THEN
        RETURN 'Product';
    ELSIF job_title = 'cpo' THEN
        RETURN 'Product';
        -- Engineering
    ELSIF job_title ~ ANY(ARRAY['engineering', 'insinööri', 'technical', 'tekninen', 'teknologia', 'process']) THEN
        RETURN 'Engineering';
        -- Logistics
    ELSIF job_title ~ ANY(ARRAY['logistics', 'supply chain', 'logistiikka', 'warehouse']) THEN
        RETURN 'Logistics';
        -- Operations
    ELSIF job_title ~ ANY(ARRAY['COO', 'operations', 'operatiivinen']) THEN
        RETURN 'Operations';
        -- Property management
    ELSIF job_title ~ ANY(ARRAY['property', 'kiinteistö', 'real estate']) THEN
        RETURN 'Property Management';
        -- Development
    ELSIF job_title ~ ANY(ARRAY['development', 'r&d', 'kehitys']) THEN
        RETURN 'Development';
        -- Legal
    ELSIF job_title ~ 'legal' THEN
        RETURN 'Legal';
        -- Sustainability
    ELSIF job_title ~ ANY(ARRAY['sustainability', 'ESG']) THEN
        RETURN 'Sustainability';
        -- HSEQ
    ELSIF job_title ~ ANY(ARRAY['health', 'safety', 'environment', 'quality', 'hseq', 'hse', 'laatu', 'quality assurance']) THEN
        RETURN 'HSEQ';
        -- Project management
    ELSIF job_title ~ ANY(ARRAY['project', 'projekti']) THEN
        RETURN 'Project Management';
        -- Other commercial
    ELSIF job_title ~ ANY(ARRAY['growth', 'kasvu', 'business', 'liiketoiminta', 'country manager', 'liiketoiminnan', 'aluepäällikkö', 'unit director']) THEN
        RETURN 'Other Commercial';
        -- Administration
    ELSIF job_title ~ ANY(ARRAY['business owner', 'perustaja', 'owner', 'hallinto', 'managing partner', 'puheenjohtaja', 'office', 'toiminnan']) THEN
        RETURN 'Administration';
        -- Software Development, generic terms
    ELSIF job_title ~ ANY(ARRAY['web', 'cloud', 'data']) THEN
        RETURN 'Software Development';
    ELSIF job_title LIKE 'QA%' THEN
        RETURN 'Software Development';
    ELSIF job_title LIKE 'cto%' THEN
        RETURN 'Software Development';
        -- Information technology, generic terms
    ELSIF job_title LIKE 'it%' THEN
        RETURN 'Information Technology';
    ELSIF job_title LIKE 'ict%' THEN
        RETURN 'Information Technology';
    ELSIF job_title LIKE 'head of it%' THEN
        RETURN 'Information Technology';
    ELSIF job_title = 'head of group it%' THEN
        RETURN 'Information Technology';
        -- Operations
    ELSIF job_title LIKE 'coo%' THEN
        RETURN 'Operations';
        -- HR
    ELSIF job_title LIKE 'henkilö%' THEN
        RETURN 'HR';
    ELSIF job_title LIKE 'hr%' THEN
        RETURN 'HR';
    ELSE
        RETURN 'Other';
    END IF;
END;
$function$

-- Previous function to get job seniority from job title
CREATE OR REPLACE FUNCTION clevenio_database.get_job_seniority(job_title text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Return NULL if job title is NULL
    IF job_title IS NULL THEN
        RETURN NULL;
    END IF;
    -- Convert to lowercase for case-insensitive matching
    job_title := lower(job_title);

    IF job_title ~ ANY(ARRAY['varatoimitusjohtaja', 'deputy ceo']) THEN
        RETURN 'Chief';
    ELSIF job_title ~ ANY(ARRAY['ceo', 'chief executive officer', 'toimitusjohtaja']) THEN
        RETURN 'CEO';
    ELSIF job_title = 'tj' THEN
        RETURN 'CEO';
    ELSIF job_title ~ ANY(ARRAY['managing director']) THEN
        RETURN 'Managing Director';
    ELSIF job_title ~ 'chief' THEN
        RETURN 'Chief';
    ELSIF job_title ILIKE 'c_o' THEN
        RETURN 'Chief';
    ELSIF job_title ~ ANY(ARRAY['chairman', 'puheenjohtaja']) THEN
        RETURN 'Chairman of the Board';
    ELSIF job_title ~ ANY(ARRAY['entrepreneur', 'yrittäjä']) THEN
        RETURN 'Entrepreneur';
    ELSIF job_title ~ ANY(ARRAY['founder', 'co-founder']) THEN
        RETURN 'Founder';
    ELSIF job_title ~ ANY(ARRAY['vice president', 'executive vice president', 'senior vice president', 'vp', 'evp', 'svp']) THEN
        RETURN 'Vice President';
    ELSIF job_title ~ 'president' THEN
        RETURN 'President';
    ELSIF job_title ~ ANY(ARRAY['director', 'johtaja']) THEN
        RETURN 'Director';
    ELSIF job_title ~ 'head of' THEN
        RETURN 'Head of';
    ELSIF job_title ~ ANY(ARRAY['manager', 'päällikkö']) THEN
        RETURN 'Manager';
    ELSIF job_title ~ 'lead' THEN
        RETURN 'Lead';
    ELSIF job_title ~ 'partner' THEN
        RETURN 'Partner';
    ELSIF job_title ~ 'executive' THEN
        RETURN 'Executive';
    ELSE
        RETURN 'Other';
    END IF;
END;
$function$

# ⚠️ VERY IMPORTANT RULES:
- You MUST return exactly one JSON object per input row.
- Do NOT skip rows, even if the title is unclear.
- If uncertain, use 'Other' for both jobFunction and jobSeniority with low confidence.
- Always echo the original 'id' field for each row, no changes.
${customAIRules}

Job Titles to classify:
${JSON.stringify(jobs, null, 2)}`;
}

let totalCost = 0;

export async function classifyJobTitles(jobs: JobTitleInput[]): Promise<JobClassification[]> {
    const aiClient = getAiClient();
    const model: GenerativeModel = aiClient.getGenerativeModel({ model: aiModel.model, generationConfig });

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
    // console.log(`Input Token Count: ${inputTokenCount}`);
    // console.log(`Output Token Count: ${outputTokenCount}`);
    if (inputTokenCount && outputTokenCount) {
        const currentCost = (inputTokenCount / 1000000) * aiModel.cost.inputTokenPerMillion + (outputTokenCount / 1000000) * aiModel.cost.outputTokenPerMillion;
        totalCost += currentCost;
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

export function getTotalAICost(): number {
    return totalCost;
}

export function resetTotalAICost(): void {
    totalCost = 0;
}