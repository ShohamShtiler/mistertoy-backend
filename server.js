import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import path from 'path'
import http from 'http'

import { socketService } from './services/socket.service.js'
import { loggerService } from './services/logger.service.js'
import { toyRoutes } from './api/toy/toy.routes.js'
import { authRoutes } from './api/auth/auth.routes.js'
import { reviewRoutes } from './api/review/review.routes.js'


const app = express()
const server = http.createServer(app)

socketService.setup(server)

if (process.env.NODE_ENV === 'production') {
	app.use(express.static('public'))
} else {
	const corsOptions = {
		origin: ['https://mistertoy-backend-2oeq.onrender.com','http://127.0.0.1:3000', 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
		credentials: true,
	}
	app.use(cors(corsOptions))
}

// App Configuration
app.use(cookieParser()) // for res.cookies
app.use(express.json()) // for req.body

app.use('/api/toy', toyRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/review', reviewRoutes)

// Unknown API paths stay errors and never fall through to the React app
app.use('/api', (req, res) => {
	res.status(404).send({ err: 'Not found' })
})

// Fallback: React Router paths have no file extension, missing files keep their 404
if (process.env.NODE_ENV === 'production') {
	app.get('*', (req, res, next) => {
		if (path.extname(req.path)) return next()
		res.sendFile(path.resolve('public/index.html'))
	})
}

// Listen will always be the last line in our server!
const port = process.env.PORT || 3030
server.listen(port, () => {
	loggerService.info(`Server listening on port http://127.0.0.1:${port}/`)
})