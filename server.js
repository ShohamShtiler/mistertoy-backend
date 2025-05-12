import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import path from 'path'

import { loggerService } from './services/logger.service.js'
import { toyService } from './services/toy.service.js'

const app = express()

// App Configuration
app.use(cookieParser()) // for res.cookies
app.use(express.json()) // for req.body

if (process.env.NODE_ENV === 'production') {
	app.use(express.static('public'))
} else {
	const corsOptions = {
		origin: ['http://127.0.0.1:3000', 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
		credentials: true,
	}
	app.use(cors(corsOptions))
}

app.get('/api/toy', (req, res) => {
	const { txt, inStock, labels, pageIdx, sortBy } = req.query

	let parsedSortBy
	try {
		parsedSortBy = typeof sortBy === 'string' ? JSON.parse(sortBy) : sortBy
	} catch (err) {
		parsedSortBy = { type: '', sortDir: 1 }
	}

	console.log('📨 Incoming sortBy:', sortBy)

	const filterBy = {
		txt: txt || '',
		inStock: inStock ?? null,
		labels: typeof labels === 'string' ? labels.split(',') : labels || [],
		pageIdx: +pageIdx || 0,
		sortBy: parsedSortBy || { type: '', sortDir: 1 },
	}


	toyService.query(filterBy)
		.then(({ toys, maxPage }) => {
			res.send({ toys, maxPage })
		})
		.catch(err => {
			loggerService.error('Cannot load toys', err)
			res.status(400).send('Cannot load toys')
		})
})

app.get('/api/toy/:toyId', (req, res) => {
	const { toyId } = req.params

	toyService
		.get(toyId)
		.then(toy => {
			res.send(toy)
		})
		.catch(err => {
			loggerService.error('Cannot get toy', err)
			res.status(400).send(err)
		})
})

app.post('/api/toy', (req, res) => {
	const { name, price, labels } = req.body
	const toy = {
		name,
		price: +price,
		labels,
	}
	toyService
		.save(toy)
		.then(savedToy => {
			res.send(savedToy)
		})
		.catch(err => {
			loggerService.error('Cannot add toy', err)
			res.status(400).send('Cannot add toy')
		})
})

app.put('/api/toy', (req, res) => {
	const { name, price, _id, labels, inStock } = req.body
	const toy = {
		_id,
		name,
		price: +price,
		labels,
		inStock,
	}
	toyService
		.save(toy)
		.then(savedToy => {
			res.send(savedToy)
		})
		.catch(err => {
			loggerService.error('Cannot update toy', err)
			res.status(400).send('Cannot update toy')
		})
})

app.delete('/api/toy/:toyId', (req, res) => {
	const { toyId } = req.params

	toyService
		.remove(toyId)
		.then(() => {
			res.send()
		})
		.catch(err => {
			loggerService.error('Cannot delete toy', err)
			res.status(400).send('Cannot delete toy, ' + err)
		})
})

// Fallback
// app.get('/**', (req, res) => {
// 	res.sendFile(path.resolve('public/index.html'))
// })

// Listen will always be the last line in our server!
const port = process.env.PORT || 3030
app.listen(port, () => {
	loggerService.info(`Server listening on port http://127.0.0.1:${port}/`)
})