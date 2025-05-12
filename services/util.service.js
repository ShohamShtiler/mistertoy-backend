import fs from 'fs'

export function readJsonFile(path) {
	const str = fs.readFileSync(path, 'utf8')
	const json = JSON.parse(str)
	return json
}

export function getRandomInt(min, max) {
	const minCeiled = Math.ceil(min)
	const maxFloored = Math.floor(max)
	return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled) // The maximum is exclusive and the minimum is inclusive
}
