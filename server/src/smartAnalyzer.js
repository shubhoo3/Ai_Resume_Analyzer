import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const systemPrompt = `You are an expert resume analyst. Extract structured data from the provided resume text.
Return strictly valid JSON with the following shape:
{
  "personalDetails": { "name": string|null, "email": string|null, "phone": string|null, "links": string[] },
  "resumeContent": {
    "summary": string|null,
    "experience": [{ "company": string|null, "title": string|null, "startDate": string|null, "endDate": string|null, "description": string|null }] ,
    "education": [{ "institution": string|null, "degree": string|null, "startDate": string|null, "endDate": string|null }],
    "projects": [{ "name": string|null, "description": string|null, "tech": string[] }],
    "certifications": [{ "name": string|null, "issuer": string|null, "date": string|null }]
  },
  "skills": { "technical": string[], "soft": string[] },
  "feedback": {
    "rating": number,  
    "improvementAreas": string, 
    "suggestedSkills": string[]
  }
}`;

function getGeminiModel() {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		throw new Error('GEMINI_API_KEY is not set');
	}
	const genAI = new GoogleGenerativeAI(apiKey);
	return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });
}

export async function analyzeResumeWithGemini(rawText) {
	const model = getGeminiModel();
	const prompt = `${systemPrompt}\n\nResume Text:\n\n${rawText}`;
	const response = await model.generateContent(prompt);
	const text = response.response.text();
	const json = extractFirstJson(text);
	return json;
}

function extractFirstJson(text) {
	try {
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start !== -1 && end !== -1 && end > start) {
			const maybe = text.slice(start, end + 1);
			return JSON.parse(maybe);
		}
	} catch {}
	return {
		personalDetails: { name: null, email: null, phone: null, links: [] },
		resumeContent: { summary: null, experience: [], education: [], projects: [], certifications: [] },
		skills: { technical: [], soft: [] },
		feedback: { rating: 0, improvementAreas: 'No feedback parsed', suggestedSkills: [] },
	};
} 