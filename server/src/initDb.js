import { ensureSchema } from './storage.js'

ensureSchema().then(() => {
	console.log('Database schema ensured.')
	process.exit(0)
}).catch((err) => {
	console.error('Failed to init DB:', err)
	process.exit(1)
}) 