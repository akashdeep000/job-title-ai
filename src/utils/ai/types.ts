import { Type, type Schema } from "@google/genai";

export interface JobTitleInput {
    id: number;
    jobTitle: string;
}

export interface JobClassification {
    id: number;
    jobFunction: string;
    jobSeniority: string;
    confidence: number;
    standardizedJobTitle: string;
    cost: number;
}

export interface AIResponse {
    classifications: JobClassification[];
    cost: number;
    status: 'success' | 'error' | 'mismatch_error';
    error?: string;
}

export const jobClassificationSchema: Schema = {
    type: Type.OBJECT,
    required: ["id", "jobFunction", "jobSeniority", "confidence", "standardizedJobTitle"],
    properties: {
        id: { type: Type.NUMBER },
        jobFunction: {
            type: Type.STRING,
            enum: ["Executive Decision Maker", "Finance", "Product", "Sales", "Customer success", "HR", "Marketing", "Communications", "Support", "Software Development", "Information Technology", "Manufacturing", "Engineering", "Logistics", "Operations", "Property Management", "Development", "Legal", "Sustainability", "HSEQ", "Project Management", "Other Commercial", "Administration", "Other"],
            format: "enum",
        },
        jobSeniority: {
            type: Type.STRING,
            enum: ["CEO", "Chief", "Managing Director", "Chairman of the Board", "Entrepreneur", "Founder", "Vice President", "President", "Director", "Head of", "Manager", "Lead", "Partner", "Executive", "Other"],
            format: "enum",
        },
        confidence: { type: Type.NUMBER },
        standardizedJobTitle: { type: Type.STRING },
    },
};