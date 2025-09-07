import React, { useMemo, useRef, useState } from 'react'
import axios from 'axios'

function pretty(obj) {
	return JSON.stringify(obj, null, 2)
}

export default function App() {
	const [activeTab, setActiveTab] = useState('analyze')
	return (
		<div className="container">
			<h1>Resume Analyzer <span className="badge">AI</span></h1>
			<div className="tabs">
				<button className={activeTab === 'analyze' ? 'active' : ''} onClick={() => setActiveTab('analyze')}>Live Analysis</button>
				<button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>History</button>
			</div>
			{activeTab === 'analyze' ? <AnalyzeTab /> : <HistoryTab />}
		</div>
	)
}

function AnalyzeTab() {
	const [file, setFile] = useState(null)
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState(null)
	const [error, setError] = useState('')
	const [progress, setProgress] = useState(0)
	const dropRef = useRef(null)

	async function handleSubmit(e) {
		e.preventDefault()
		setError('')
		setResult(null)
		if (!file) {
			setError('Please select a PDF file')
			return
		}
		if (file.type !== 'application/pdf') {
			setError('Only PDF files are allowed')
			return
		}
		if (file.size > 8 * 1024 * 1024) {
			setError('File too large (max 8MB)')
			return
		}
		const data = new FormData()
		data.append('file', file)
		setLoading(true)
		try {
			const res = await axios.post('/api/analyze', data, {
				headers: { 'Content-Type': 'multipart/form-data' },
				onUploadProgress: e => {
					if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
				}
			})
			setResult(res.data.analysis)
		} catch (err) {
			setError(err?.response?.data?.error || 'Failed to analyze')
		} finally {
			setLoading(false)
			setProgress(0)
		}
	}

	function onDropFiles(e) {
		e.preventDefault()
		e.stopPropagation()
		dropRef.current?.classList.remove('dragover')
		const f = e.dataTransfer.files?.[0]
		if (f) setFile(f)
	}
	function onDragOver(e) {
		e.preventDefault()
		dropRef.current?.classList.add('dragover')
	}
	function onDragLeave(e) {
		e.preventDefault()
		dropRef.current?.classList.remove('dragover')
	}

	return (
		<div>
			<div ref={dropRef} className="dropzone" onDrop={onDropFiles} onDragOver={onDragOver} onDragLeave={onDragLeave}>
				<div className="row">
					<strong>Drop your PDF here</strong>
					<span>or</span>
					<label className="btn">Choose file<input style={{ display: 'none' }} type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
				</div>
				{file && <div className="fileMeta">{file.name} ({Math.round(file.size/1024)} KB)</div>}
			</div>
			<div className="spacer" />
			<form onSubmit={handleSubmit} className="uploadForm">
				<button className="btn primary" type="submit" disabled={loading}>{loading ? 'Analyzing...' : 'Upload & Analyze'}</button>
			</form>
			{loading && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}
			{error && <p className="error">{error}</p>}
			{result && <AnalysisView analysis={result} />}
		</div>
	)
}

function AnalysisView({ analysis }) {
	const personal = useMemo(() => ({
		name: analysis.name,
		email: analysis.email,
		phone: analysis.phone,
		links: analysis.links || [],
	}), [analysis])
	const resumeContent = useMemo(() => ({
		summary: analysis.summary,
		experience: analysis.experience || [],
		education: analysis.education || [],
		projects: analysis.projects || [],
		certifications: analysis.certifications || [],
	}), [analysis])
	const skills = useMemo(() => ({
		technical: analysis.technical_skills || [],
		soft: analysis.soft_skills || [],
	}), [analysis])
	const feedback = useMemo(() => ({
		rating: analysis.rating,
		improvementAreas: analysis.improvement_areas,
		suggestedSkills: analysis.suggested_skills || [],
	}), [analysis])
	return (
		<div className="analysis sectionGrid">
			<details className="card" open>
				<summary className="sectionHeader"><h2>Personal Details</h2><span className="badge">parsed</span></summary>
				<div className="content"><pre>{pretty(personal)}</pre></div>
			</details>
			<details className="card" open>
				<summary className="sectionHeader"><h2>Resume Content</h2></summary>
				<div className="content"><pre>{pretty(resumeContent)}</pre></div>
			</details>
			<details className="card" open>
				<summary className="sectionHeader"><h2>Skills</h2></summary>
				<div className="content"><pre>{pretty(skills)}</pre></div>
			</details>
			<details className="card" open>
				<summary className="sectionHeader"><h2>AI Feedback</h2>{typeof feedback.rating === 'number' && <span className="badge">Rating: {feedback.rating}</span>}</summary>
				<div className="content"><pre>{pretty(feedback)}</pre></div>
			</details>
		</div>
	)
}

function HistoryTab() {
	const [items, setItems] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [selected, setSelected] = useState(null)

	React.useEffect(() => {
		let mounted = true
		setLoading(true)
		axios.get('/api/analyses').then(res => {
			if (mounted) setItems(res.data.items || [])
		}).catch(err => {
			setError(err?.response?.data?.error || 'Failed to load history')
		}).finally(() => setLoading(false))
		return () => { mounted = false }
	}, [])

	return (
		<div>
			{loading && <p className="empty">Loading...</p>}
			{error && <p className="error">{error}</p>}
			{items.length === 0 && !loading ? (
				<p className="empty">No analyses yet. Upload a PDF in Live Analysis.</p>
			) : (
				<table>
					<thead>
						<tr>
							<th>Name</th>
							<th>Email</th>
							<th>File</th>
							<th>Created</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody>
						{items.map(row => (
							<tr key={row.id}>
								<td>{row.name || '-'}</td>
								<td>{row.email || '-'}</td>
								<td>{row.original_filename}</td>
								<td>{new Date(row.created_at).toLocaleString()}</td>
								<td><button className="btn" onClick={() => setSelected(row.id)}>Details</button></td>
							</tr>
						))}
					</tbody>
				</table>
			)}
			{selected && <DetailsModal id={selected} onClose={() => setSelected(null)} />}
		</div>
	)
}

function DetailsModal({ id, onClose }) {
	const [data, setData] = useState(null)
	const [error, setError] = useState('')
	React.useEffect(() => {
		axios.get(`/api/analyses/${id}`).then(res => setData(res.data.analysis)).catch(err => setError(err?.response?.data?.error || 'Failed to load analysis'))
	}, [id])
	return (
		<div className="modalBackdrop" role="dialog" aria-modal="true">
			<div className="modal">
				<div className="modalHeader">
					<h3>Analysis Details</h3>
					<button className="btn" onClick={onClose} aria-label="Close">Close</button>
				</div>
				{error && <p className="error">{error}</p>}
				{!data ? <p>Loading...</p> : <AnalysisView analysis={data} />}
			</div>
		</div>
	)
} 