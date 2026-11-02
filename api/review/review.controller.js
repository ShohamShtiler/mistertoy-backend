import { reviewService } from './review.service.js'
import { loggerService } from '../../services/logger.service.js'
import { isValidSearchTxt } from '../../services/util.service.js'
import { ObjectId } from 'mongodb'

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i

export async function getReviews(req, res) {
    try {
        const filterBy = req.query  // ✅ Must grab the query
        if (!_isValidReviewQuery(filterBy)) return res.status(400).send({ err: 'Invalid query' })
        const reviews = await reviewService.query(filterBy) // ✅ Pass it forward
        res.send(reviews)
    } catch (err) {
        res.status(500).send({ err: 'Failed to get reviews' })
    }
}

function _isValidReviewQuery({ txt, toyId, userId }) {
    const isValidId = id => id === undefined || (typeof id === 'string' && OBJECT_ID_REGEX.test(id))
    return isValidSearchTxt(txt) && isValidId(toyId) && isValidId(userId)
}

export async function addReview(req, res) {
  try {
    const { txt, toyId } = req.body
    if (typeof txt !== 'string' || !txt.trim()) return res.status(400).send({ err: 'Review text is required' })
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
        const { loggedinUser } = req
        const review = await reviewService.getById(id)
        if (!review) return res.status(404).send({ err: 'Review not found' })
        if (!loggedinUser.isAdmin && String(review.byUserId) !== loggedinUser._id) {
            loggerService.warn(loggedinUser.fullname + ' attempted to delete a review of another user')
            return res.status(403).send({ err: 'Not Authorized' })
        }
        const removedId = await reviewService.remove(id)
        res.send(removedId)
    } catch (err) {
        loggerService.error('Failed to delete review', err)
        res.status(500).send({ err: 'Failed to delete review' })
    }
}