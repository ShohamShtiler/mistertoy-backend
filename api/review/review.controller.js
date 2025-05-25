import { reviewService } from './review.service.js'
import { loggerService } from '../../services/logger.service.js'
import { ObjectId } from 'mongodb'

export async function getReviews(req, res) {
    try {
        const filterBy = req.query  // ✅ Must grab the query
        const reviews = await reviewService.query(filterBy) // ✅ Pass it forward
        res.send(reviews)
    } catch (err) {
        res.status(500).send({ err: 'Failed to get reviews' })
    }
}

export async function addReview(req, res) {
  try {
    const { txt, toyId } = req.body
    const { _id: userId } = req.loggedinUser

    const review = {
      txt,
      toyId: new ObjectId(toyId),
      byUserId: new ObjectId(userId)
    }

    await reviewService.add(review)

    // ⬅️ This must return the full reviews array
    const reviews = await reviewService.query({ toyId })
    res.send(reviews)
  } catch (err) {
    loggerService.error('Failed to add review', err)
    res.status(500).send({ err: 'Failed to add review' })
  }
}

export async function deleteReview(req, res) {
    try {
        const { id } = req.params
        const removedId = await reviewService.remove(id)
        res.send(removedId)
    } catch (err) {
        loggerService.error('Failed to delete review', err)
        res.status(500).send({ err: 'Failed to delete review' })
    }
}