import { dbService } from '../../services/db.service.js'
import { escapeRegExp } from '../../services/util.service.js'
import { ObjectId } from 'mongodb'

export const reviewService = {
    query,
    getById,
    add,
    remove
}

async function query(filterBy = {}) {
    const criteria = {}
    if (filterBy.toyId) criteria.toyId = new ObjectId(String(filterBy.toyId))
    if (filterBy.userId) criteria.byUserId = new ObjectId(String(filterBy.userId))
    if (filterBy.txt) criteria.txt = { $regex: escapeRegExp(filterBy.txt), $options: 'i' }

    const collection = await dbService.getCollection('review')
    const reviews = await collection.aggregate([
        { $match: criteria },
        {
            $lookup: {
                from: 'user',
                localField: 'byUserId',
                foreignField: '_id',
                as: 'user'
            }
        },
        {
            $lookup: {
                from: 'toy',
                localField: 'toyId',
                foreignField: '_id',
                as: 'toy'
            }
        },
        { $unwind: '$user' },
        { $unwind: '$toy' },
        {
            $project: {
                txt: 1,
                _id: 1,
                user: { _id: '$user._id', fullname: '$user.fullname' },
                toy: { _id: '$toy._id', name: '$toy.name', price: '$toy.price' }
            }
        }
    ]).toArray()

    return reviews
}

async function getById(reviewId) {
    const collection = await dbService.getCollection('review')
    return collection.findOne({ _id: new ObjectId(reviewId) })
}

async function add(review) {
    const collection = await dbService.getCollection('review')
    review.byUserId = new ObjectId(String(review.byUserId))
    review.toyId = new ObjectId(String(review.toyId))
    await collection.insertOne(review)
    return review
}

async function remove(reviewId) {
    const collection = await dbService.getCollection('review')
    await collection.deleteOne({ _id: new ObjectId(reviewId) })
    return reviewId
}