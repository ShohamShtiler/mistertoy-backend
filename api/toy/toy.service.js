import { dbService } from '../../services/db.service.js'
import { ObjectId } from 'mongodb'

const PAGE_SIZE = 4

export const toyService = {
  query,
  getById,
  remove,
  save,
}

async function query(filterBy = {}) {
  try {
    const criteria = {}

    // 🔍 Text filter (by name)
    if (filterBy.txt) {
      const regex = new RegExp(filterBy.txt, 'i')
      criteria.name = { $regex: regex }
    }

    // 🔍 In-stock filter
    if (filterBy.inStock !== null && filterBy.inStock !== undefined) {
      criteria.inStock = filterBy.inStock === 'true' || filterBy.inStock === true
    }

    // 🔍 Labels filter (every label must match)
    if (filterBy.labels && filterBy.labels.length) {
      criteria.labels = { $all: filterBy.labels }
    }

    // 🧠 Setup sort
    const sortCriteria = {}
    if (filterBy.sortBy?.type) {
      const dir = +filterBy.sortBy.desc || 1
      sortCriteria[filterBy.sortBy.type] = dir
    }

    const collection = await dbService.getCollection('toy')

    // 📄 Total count for pagination
    const totalToys = await collection.countDocuments(criteria)

    const pageIdx = +filterBy.pageIdx || 0

    const toys = await collection
      .find(criteria)
      .sort(sortCriteria)
      .skip(pageIdx * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray()

    return {
      toys,
      maxPage: Math.ceil(totalToys / PAGE_SIZE)
    }
  } catch (err) {
    console.error('Cannot query toys', err)
    throw err
  }
}

async function getById(toyId) {
  try {
    const collection = await dbService.getCollection('toy')
    return await collection.findOne({ _id: new ObjectId(toyId) })
  } catch (err) {
    console.error('Cannot get toy by id', err)
    throw err
  }
}

async function remove(toyId) {
  try {
    const collection = await dbService.getCollection('toy')
    await collection.deleteOne({ _id: new ObjectId(toyId) })
  } catch (err) {
    console.error('Cannot delete toy', err)
    throw err
  }
}

async function save(toy) {
  try {
    const collection = await dbService.getCollection('toy')

    if (toy._id) {
      toy._id = new ObjectId(toy._id)
      await collection.updateOne({ _id: toy._id }, { $set: toy })
      return toy
    } else {
      toy.createdAt = Date.now()
      toy.inStock = true
      const res = await collection.insertOne(toy)
      toy._id = res.insertedId
      return toy
    }
  } catch (err) {
    console.error('Cannot save toy', err)
    throw err
  }
}