import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import { getDb, ensureSchema } from './storage.js';
import { analyzeResumeWithGemini } from './smartAnalyzer.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 8 * 1024 * 1024 },
	fileFilter: (req, file, cb) => {
		if (file.mimetype !== 'application/pdf') {
			return cb(new Error('Only PDF files are allowed'));
		}
		cb(null, true);
	},
});

app.get('/api/health', (req, res) => {
	res.json({ ok: true });
});

app.post('/api/analyze', upload.single('file'), async (req, res) => {
	try {
		if (!req.file) {
			return res.status(400).json({ error: 'No file uploaded' });
		}

		const pdfBuffer = req.file.buffer;
		const pdfData = await pdf(pdfBuffer);
		const rawText = pdfData.text || '';

		const analysis = await analyzeResumeWithGemini(rawText);

		const db = getDb();
		const stmt = db.prepare(`
			INSERT INTO analyses (
				name, email, phone, links,
				summary, experience, education, projects, certifications,
				technical_skills, soft_skills,
				rating, improvement_areas, suggested_skills,
				original_filename, raw_text
			) VALUES (
				@name, @email, @phone, @links,
				@summary, @experience, @education, @projects, @certifications,
				@technical_skills, @soft_skills,
				@rating, @improvement_areas, @suggested_skills,
				@original_filename, @raw_text
			);
		`);
		const payload = {
			name: analysis.personalDetails?.name || null,
			email: analysis.personalDetails?.email || null,
			phone: analysis.personalDetails?.phone || null,
			links: JSON.stringify(analysis.personalDetails?.links || []),
			summary: analysis.resumeContent?.summary || null,
			experience: JSON.stringify(analysis.resumeContent?.experience || []),
			education: JSON.stringify(analysis.resumeContent?.education || []),
			projects: JSON.stringify(analysis.resumeContent?.projects || []),
			certifications: JSON.stringify(analysis.resumeContent?.certifications || []),
			technical_skills: JSON.stringify(analysis.skills?.technical || []),
			soft_skills: JSON.stringify(analysis.skills?.soft || []),
			rating: analysis.feedback?.rating || null,
			improvement_areas: analysis.feedback?.improvementAreas || null,
			suggested_skills: JSON.stringify(analysis.feedback?.suggestedSkills || []),
			original_filename: req.file.originalname,
			raw_text: rawText,
		};
		const info = stmt.run(payload);
		const analysisRow = db.prepare('SELECT * FROM analyses WHERE id = ?').get(info.lastInsertRowid);

		res.json({ analysis: analysisRow });
	} catch (error) {
		console.error('Analyze error:', error);
		res.status(500).json({ error: 'Failed to analyze resume' });
	}
});

app.get('/api/analyses', async (req, res) => {
	try {
		const db = getDb();
		const rows = db.prepare(`SELECT id, name, email, original_filename, created_at FROM analyses ORDER BY datetime(created_at) DESC`).all();
		res.json({ items: rows });
	} catch (error) {
		console.error('List analyses error:', error);
		res.status(500).json({ error: 'Failed to fetch analyses' });
	}
});

app.get('/api/analyses/:id', async (req, res) => {
	try {
		const db = getDb();
		const row = db.prepare(`SELECT * FROM analyses WHERE id = ?`).get(req.params.id);
		if (!row) {
			return res.status(404).json({ error: 'Not found' });
		}
		res.json({ analysis: row });
	} catch (error) {
		console.error('Get analysis error:', error);
		res.status(500).json({ error: 'Failed to fetch analysis' });
	}
});

app.listen(port, async () => {
	await ensureSchema();
	console.log(`Server running on http://localhost:${port}`);
}); 