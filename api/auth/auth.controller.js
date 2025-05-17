import { authService } from './auth.service.js'
import { loggerService } from '../../services/logger.service.js'

export async function login(req, res) {
  try {
    const { username, password } = req.body
    const user = await authService.login(username, password)
    const loginToken = authService.getLoginToken(user)
    res.cookie('loginToken', loginToken, { httpOnly: true })
    res.send(user)
  } catch (err) {
    loggerService.error('Failed to login', err)
    res.status(401).send({ err: 'Invalid credentials' })
  }
}

export async function signup(req, res) {
  try {
    const { username, password, fullname } = req.body
    const account = await authService.signup(username, password, fullname)
    const user = await authService.login(username, password)
    const loginToken = authService.getLoginToken(user)
    res.cookie('loginToken', loginToken, { httpOnly: true })
    res.send(user)
  } catch (err) {
    loggerService.error('Failed to signup', err)
    res.status(500).send({ err: 'Signup failed' })
  }
}

export async function logout(req, res) {
  try {
    res.clearCookie('loginToken')
    res.send({ msg: 'Logged out successfully' })
  } catch (err) {
    res.status(500).send({ err: 'Logout failed' })
  }
}