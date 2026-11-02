import { authService } from './auth.service.js'
import { loggerService } from '../../services/logger.service.js'
import { loginLimitService } from '../../services/login-limit.service.js'

export async function login(req, res) {
  const { username, password } = req.body
  const attempt = loginLimitService.startAttempt(username, req)
  if (attempt.retryAfterSeconds) {
    res.set('Retry-After', String(attempt.retryAfterSeconds))
    return res.status(429).send({ err: 'Too many login attempts, please try again later' })
  }

  try {
    const user = await authService.login(username, password)
    attempt.succeed()
    const loginToken = authService.getLoginToken(user)
    res.cookie('loginToken', loginToken, { httpOnly: true })
    res.send(user)
  } catch (err) {
    loggerService.error('Failed to login', err)
    if (err.isInvalidLogin) return res.status(401).send({ err: 'Invalid credentials' })
    attempt.abort()
    res.status(500).send({ err: 'Login failed' })
  }
}

export async function getCurrentUser(req, res) {
  try {
    const { loginToken } = req.cookies
    const user = loginToken ? await authService.getLoggedinUser(loginToken) : null
    if (loginToken && !user) res.clearCookie('loginToken')
    res.set('Cache-Control', 'no-store')
    res.json(user)
  } catch (err) {
    loggerService.error('Failed to get current user', err)
    res.status(500).send({ err: 'Failed to get current user' })
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