import { toyService } from './toy.service.js'
import { loggerService } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'
import { isValidSearchTxt } from '../../services/util.service.js'

const SORTABLE_FIELDS = ['name', 'price', 'createdAt']

export async function getToys(req, res) {
  try {
    if (!_isValidToyQuery(req.query)) return res.status(400).send({ err: 'Invalid query' })
    const filterBy = { ...req.query, labels: _getLabels(req.query.labels) }
    const result = await toyService.query(filterBy)
    res.send(result)
  } catch (err) {
    loggerService.error('Failed to get toys', err)
    res.status(500).send({ err: 'Failed to get toys' })
  }
}

export async function getDashboardToys(req, res) {
  try {
    const toys = await toyService.getDashboardToys()
    res.send(toys)
  } catch (err) {
    loggerService.error('Failed to get dashboard toys', err)
    res.status(500).send({ err: 'Failed to get dashboard toys' })
  }
}

export async function getToyById(req, res) {
  try {
    const toyId = req.params.id
    const toy = await toyService.getById(toyId)
    res.send(toy)
  } catch (err) {
    loggerService.error('Failed to get toy', err)
    res.status(500).send({ err: 'Failed to get toy' })
  }
}

export async function addToy(req, res) {
  const { loggedinUser } = req
  try {
    const toy = req.body
    toy.owner = loggedinUser
    const addedToy = await toyService.save(toy)
    res.send(addedToy)
  } catch (err) {
    loggerService.error('Failed to add toy', err)
    res.status(500).send({ err: 'Failed to add toy' })
  }
}

export async function updateToy(req, res) {
	try {
		const toy = { ...req.body, _id: req.params.id }
		const updatedToy = await toyService.save(toy)

		socketService.emitTo({
			type: 'admin-updated',
			data: `🛠️ "${updatedToy.name}" was updated by admin.`,
		})

		res.send(updatedToy)
	} catch (err) {
		loggerService.error('Failed to update toy', err)
		res.status(500).send({ err: 'Failed to update toy' })
	}
}

export async function removeToy(req, res) {
  try {
    const toyId = req.params.id
    await toyService.remove(toyId)
    res.send({ msg: 'Toy deleted successfully' })
  } catch (err) {
    loggerService.error('Failed to delete toy', err)
    res.status(500).send({ err: 'Failed to delete toy' })
  }
}

export async function addToyMsg(req, res) {
  const { loggedinUser } = req
  try {
    const toyId = req.params.id
    const { txt } = req.body
    if (typeof txt !== 'string' || !txt.trim()) return res.status(400).send({ err: 'Comment text is required' })
    const msg = {
      id: Date.now().toString(36), // simple unique ID
      txt,
      by: {
        _id: loggedinUser._id,
        fullname: loggedinUser.fullname
      },
      createdAt: Date.now()
    }
    const savedMsg = await toyService.addToyMsg(toyId, msg)
    res.json(savedMsg)
  } catch (err) {
    loggerService.error('Failed to add toy msg', err)
    res.status(500).send({ err: 'Failed to add toy msg' })
  }
}

function _isValidToyQuery({ txt, inStock, labels, pageIdx, sortBy }) {
  if (!isValidSearchTxt(txt)) return false
  if (inStock !== undefined && inStock !== 'true' && inStock !== 'false') return false
  if (!_getLabels(labels).every(label => typeof label === 'string')) return false
  if (pageIdx !== undefined && !/^\d{1,9}$/.test(String(pageIdx))) return false
  if (sortBy === undefined) return true
  if (Object.prototype.toString.call(sortBy) !== '[object Object]') return false
  const { type, desc } = sortBy
  if (type !== undefined && type !== '' && !SORTABLE_FIELDS.includes(type)) return false
  return desc === undefined || desc === '1' || desc === '-1'
}

function _getLabels(labels) {
  return labels === undefined ? [] : [].concat(labels)
}

export async function removeToyMsg(req, res) {
  const { loggedinUser } = req
  try {
    const toyId = req.params.id
    const { msgId } = req.params
    const removedId = await toyService.removeToyMsg(toyId, msgId)
    res.send(removedId)
  } catch (err) {
    loggerService.error('Failed to remove toy msg', err)
    res.status(500).send({ err: 'Failed to remove toy msg' })
  }
}