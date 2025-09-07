# Resume Analyzer

Full-stack app: React (Vite) + Node/Express + SQLite + Google Gemini.

## Prerequisites

- Node.js 18+
- Google Gemini API key

## Setup

1. Configure backend env:

- Create `server/.env` with:

```
PORT=4000
DATA_DIR=./data
GEMINI_API_KEY=YOUR_KEY
GEMINI_MODEL=gemini-1.5-flash
```

2. Install deps:

```
cd server && npm i
cd ../client && npm i
```

3. Initialize DB (optional, server also does this on boot):

```
cd ../server && npm run init:db
```

## Run

- Terminal A (backend):

```
cd server && npm run dev
```

- Terminal B (frontend):

```
cd client && npm run dev
```

Open http://localhost:5173

## API

- POST `/api/analyze` form-data `file` (PDF)
- GET `/api/analyses` list
- GET `/api/analyses/:id` detail

## Notes

- PDF text extraction uses `pdf-parse`.
- LLM parsing uses Gemini; output is coerced to JSON.
- Data is saved into `analyses` table in `data/resume_analyzer.sqlite`.
