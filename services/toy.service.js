import fs from 'fs'
import { readJsonFile, getRandomInt } from './util.service.js'

const PAGE_SIZE = 4
const toys = readJsonFile('data/toy.json')

export const toyService = {
	query,
	get,
	remove,
	save,
}

function query(filterBy = {}) {
	let filteredToys = [...toys]

	if (filterBy.txt) {
		const regExp = new RegExp(filterBy.txt, 'i')
		filteredToys = filteredToys.filter(toy => regExp.test(toy.name))
	}
	if (filterBy.inStock !== null) {
		filteredToys = filteredToys.filter(toy => toy.inStock === JSON.parse(filterBy.inStock))
	}
	if (filterBy.labels.length) {
		filteredToys = filteredToys.filter(
			toy => filterBy.labels.every(label => toy.labels.includes(label))
			// filterBy.labels.some(label => toy.labels.includes(label))
		)
	}

	const sortBy = filterBy.sortBy

	if (sortBy.type) {
		filteredToys.sort((toy1, toy2) => {
			const sortDir = +sortBy.desc || 1
			if (sortBy.type === 'name') {
				return toy1.name.localeCompare(toy2.name) * sortDir
			} else if (sortBy.type === 'price' || sortBy.type === 'createdAt') {
				return (toy1[sortBy.type] - toy2[sortBy.type]) * sortDir
			}
		})
	}

	if (filterBy.pageIdx !== undefined) {
		const startIdx = filterBy.pageIdx * PAGE_SIZE
		filteredToys = filteredToys.slice(startIdx, startIdx + PAGE_SIZE)
	}

	return Promise.resolve({ toys: filteredToys, maxPage: Math.ceil(toys.length / PAGE_SIZE) })
}

function get(toyId) {
	const toy = toys.find(toy => toy._id === toyId)
	if (!toy) return Promise.reject('Toy not found')
	return Promise.resolve(toy)
}

function remove(toyId) {
	const idx = toys.findIndex(toy => toy._id === toyId)
	if (idx === -1) return Promise.reject('No such toy')
	toys.splice(idx, 1)
	return _saveToysToFile()
}

function save(toy) {
	if (toy._id) {
		const idx = toys.findIndex(currToy => currToy._id === toy._id)
		toys[idx] = { ...toys[idx], ...toy }
	} else {
		toy._id = _makeId()
		toy.createdAt = Date.now()
		toy.inStock = true
		toys.unshift(toy)
	}
	return _saveToysToFile().then(() => toy)
}

function _makeId(length = 5) {
	let id = ''
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
	for (let i = 0; i < length; i++) {
		id += possible.charAt(getRandomInt(0, possible.length))
	}
	return id
}

function _saveToysToFile() {
	return new Promise(resolve => {
		const toysStr = JSON.stringify(toys, null, 4)
        
		fs.writeFile('data/toy.json', toysStr, err => {
			if (err) return console.log(err)
			resolve()
		})
	})
}