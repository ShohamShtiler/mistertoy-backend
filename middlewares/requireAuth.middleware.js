import { loggerService } from '../services/logger.service.js'
import { authService } from '../api/auth/auth.service.js'

export async function requireAuth(req, res, next) {
	console.log('🔐 Running requireAuth...')
	if (!req?.cookies?.loginToken) {
		console.log('❌ No loginToken')
		return res.status(401).send('Not Authenticated')
	}
    
	let loggedinUser
	try {
		loggedinUser = await authService.getLoggedinUser(req.cookies.loginToken)
	} catch (err) {
		// Fail closed: if the database cannot confirm who this is, nothing privileged runs
		loggerService.error('Cannot verify logged in user', err)
		return res.status(500).send({ err: 'Cannot verify user' })
	}
	if (!loggedinUser) {
		console.log('❌ Invalid token')
		return res.status(401).send('Not Authenticated')
	}

	req.loggedinUser = loggedinUser
	console.log('✅ Logged in as:', loggedinUser.fullname)
	next()
}

// Must run after requireAuth, which loads the user's current state from the database
export async function requireAdmin(req, res, next) {
    const { loggedinUser } = req
    if (!loggedinUser) return res.status(401).send('Not Authenticated')
    if (!loggedinUser.isAdmin) {
        loggerService.warn(loggedinUser.fullname + ' attempted to perform admin action')
        res.status(403).end('Not Authorized')
        return
    }
    next()
}