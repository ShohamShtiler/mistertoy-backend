import Cryptr from 'cryptr'
import bcrypt from 'bcrypt'


import { userService } from '../user/user.service.js'
import { loggerService } from '../../services/logger.service.js'


export const authService = {
    signup,
    login,
    getLoginToken,
    validateToken
}


const MIN_SECRET_LENGTH = 32
const cryptr = new Cryptr(_getLoginSecret())


async function login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') throw new Error('Invalid username or password')

    loggerService.debug(`auth.service - login with username: ${username}`)


    const user = await userService.getByUsername(username)
    if (!user) throw new Error('Invalid username or password')


    const match = await bcrypt.compare(password, user.password)
    if (!match) throw new Error('Invalid username or password')


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


function _getLoginSecret() {
    const secret = process.env.SECRET1
    if (!secret || secret.trim().length < MIN_SECRET_LENGTH) {
        throw new Error(`SECRET1 environment variable is required and must be at least ${MIN_SECRET_LENGTH} characters`)
    }
    return secret
}
