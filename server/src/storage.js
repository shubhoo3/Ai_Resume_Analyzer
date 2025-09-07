import dotenv from 'dotenv'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

dotenv.config()

let db

export function getDb() {
	if (!db) {
		const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data')
		if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
		const dbPath = path.join(dataDir, 'resume_analyzer.sqlite')
		db = new Database(dbPath)
		db.pragma('journal_mode = WAL')
	}
	return db
}

export async function ensureSchema() {
	const database = getDb()
	database.exec(`
		CREATE TABLE IF NOT EXISTS analyses (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT,
			email TEXT,
			phone TEXT,
			links TEXT,
			summary TEXT,
			experience TEXT,
			education TEXT,
			projects TEXT,
			certifications TEXT,
			technical_skills TEXT,
			soft_skills TEXT,
			rating INTEGER,
			improvement_areas TEXT,
			suggested_skills TEXT,
			original_filename TEXT,
			raw_text TEXT,
			created_at TEXT DEFAULT (datetime('now'))
		);
	`)
} 