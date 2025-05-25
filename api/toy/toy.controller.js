import { toyService } from './toy.service.js'
import { loggerService } from '../../services/logger.service.js'
import { socketService } from '../../services/socket.service.js'

export async function getToys(req, res) {
  try {
    const filterBy = req.query
    const result = await toyService.query(filterBy)
    res.send(result)
  } catch (err) {
    loggerService.error('Failed to get toys', err)
    res.status(500).send({ err: 'Failed to get toys' })
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
    logger.error('Failed to delete toy', err)
    res.status(500).send({ err: 'Failed to delete toy' })
  }
}

export async function addToyMsg(req, res) {
  const { loggedinUser } = req
  try {
    const toyId = req.params.id
    const msg = {
      id: Date.now().toString(36), // simple unique ID
      txt: req.body.txt,
      by: {
        _id: loggedinUser._id,
        fullname: loggedinUser.fullname
      },
      createdAt: Date.now()
    }
    const savedMsg = await toyService.addToyMsg(toyId, msg)
    res.json(savedMsg)
  } catch (err) {
    logger.error('Failed to add toy msg', err)
    res.status(500).send({ err: 'Failed to add toy msg' })
  }
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