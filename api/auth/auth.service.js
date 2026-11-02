import Cryptr from 'cryptr'
import bcrypt from 'bcrypt'
import { randomBytes } from 'crypto'


import { userService } from '../user/user.service.js'
import { loggerService } from '../../services/logger.service.js'


export const authService = {
    signup,
    login,
    getLoginToken,
    validateToken,
    getLoggedinUser
}


const MIN_SECRET_LENGTH = 32
const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i
const cryptr = new Cryptr(_getLoginSecret())
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 10)


async function login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') throw _getInvalidLoginError()

    loggerService.debug(`auth.service - login with username: ${username}`)


    const user = await userService.getByUsername(username)

    // Unknown usernames take the same time as wrong passwords, so timing does not reveal which accounts exist
    const match = await bcrypt.compare(password, user?.password || DUMMY_PASSWORD_HASH)
    if (!user || !match) throw _getInvalidLoginError()


    delete user.password
    return user
}


async function signup(username, password, fullname) {
    const saltRounds = 10


    loggerService.debug(`auth.service - signup with username: ${username}, fullname: ${fullname}`)
    if ([username, password, fullname].some(field => !field || typeof field !== 'string')) throw new Error('Missing details')


    const hash = await bcrypt.hash(password, saltRounds)
    return userService.add({ username, password: hash, fullname, isAdmin: false })
}


function getLoginToken(user) {
    const userInfo = {_id : user._id, fullname: user.fullname, isAdmin: user.isAdmin}
    return cryptr.encrypt(JSON.stringify(userInfo))    
}


function validateToken(loginToken) {
    try {
        const json = cryptr.decrypt(loginToken)
        const loggedinUser = JSON.parse(json)
        return loggedinUser
    } catch(err) {
        console.log('Invalid login token')
    }
    return null
}


// The token only proves who the user is: their current state always comes from the database.
// Returns null for a bad token or a deleted user, and throws if the database cannot answer.
async function getLoggedinUser(loginToken) {
    const tokenUser = validateToken(loginToken)
    if (typeof tokenUser?._id !== 'string' || !OBJECT_ID_REGEX.test(tokenUser._id)) return null

    const user = await userService.getById(tokenUser._id)
    if (!user) return null
    return { _id: user._id.toString(), fullname: user.fullname, isAdmin: user.isAdmin === true }
}


function _getInvalidLoginError() {
    const err = new Error('Invalid username or password')
    err.isInvalidLogin = true
    return err
}


function _getLoginSecret() {
    const secret = process.env.SECRET1
    if (!secret || secret.trim().length < MIN_SECRET_LENGTH) {
        throw new Error(`SECRET1 environment variable is required and must be at least ${MIN_SECRET_LENGTH} characters`)
    }
    return secret
}
