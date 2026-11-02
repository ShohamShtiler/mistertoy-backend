import fs from 'fs'

const MAX_SEARCH_LENGTH = 100

export function readJsonFile(path) {
	const str = fs.readFileSync(path, 'utf8')
	const json = JSON.parse(str)
	return json
}

// Search text is always matched literally, so it cannot be an invalid or slow regular expression
export function escapeRegExp(txt) {
	return txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function isValidSearchTxt(txt) {
	return txt === undefined || (typeof txt === 'string' && txt.length <= MAX_SEARCH_LENGTH)
}

export function getRandomInt(min, max) {
	const minCeiled = Math.ceil(min)
	const maxFloored = Math.floor(max)
	return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled) // The maximum is exclusive and the minimum is inclusive
}
