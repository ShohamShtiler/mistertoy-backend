import { isIP } from 'net'
import { Server } from 'socket.io'
import cookieParser from 'cookie-parser'
import { toyService } from '../api/toy/toy.service.js'
import { authService } from '../api/auth/auth.service.js'

const IS_PROD = process.env.NODE_ENV === 'production'
const TRUST_CF_CONNECTING_IP = IS_PROD && process.env.TRUST_CF_CONNECTING_IP === 'true'
const PROD_ORIGIN = 'https://mistertoy-backend-2oeq.onrender.com'
const DEV_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173']
const ALLOWED_ORIGINS = IS_PROD ? [PROD_ORIGIN] : [PROD_ORIGIN, ...DEV_ORIGINS]

const GUEST_NAME = 'Guest'
const MAX_MSG_LENGTH = 500
const MAX_BUFFER_SIZE = 8 * 1024 // 500 chars are at most 1.5 KB of UTF-8, plus the event envelope
const TOY_ID_REGEX = /^[a-f\d]{24}$/i

const RATE_LIMITS = {
    chatBurst: { limit: 5, windowMs: 10 * 1000 },
    chatHour: { limit: 60, windowMs: 60 * 60 * 1000 },
    chatGlobal: { limit: 120, windowMs: 60 * 1000 },
    typing: { limit: 200, windowMs: 10 * 1000 },
    join: { limit: 60, windowMs: 60 * 1000 },
}
const MAX_RATE_BUCKETS = 10000
const rateBuckets = new Map()

let io = null

function setup(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: ALLOWED_ORIGINS,
            credentials: true,
        },
        // CORS does not apply to WebSocket connections, so the origin is checked here too.
        // Requests with no Origin are not from a browser page: they stay allowed, but are only ever guests.
        allowRequest: (req, callback) => {
            const { origin } = req.headers
            callback(null, !origin || ALLOWED_ORIGINS.includes(origin))
        },
        maxHttpBufferSize: MAX_BUFFER_SIZE,
    })

    io.engine.use(cookieParser())

    io.use(async (socket, next) => {
        socket.data.userName = await _getVerifiedUserName(socket)
        next()
    })

    io.on('connection', socket => {
        console.log('User connected', socket.id)
        socket.data.clientIp = _getClientIp(socket)

        socket.on('join-toy', toyId => {
            if (!_isValidToyId(toyId)) return
            if (!_isAllowed(`join:${socket.data.clientIp}`, RATE_LIMITS.join)) return
            socket.join(toyId)
            console.log(`Socket ${socket.id} joined toy room ${toyId}`)
        })

        socket.on('chat-msg', async payload => {
            const chatRequest = _parseChatRequest(payload)
            if (!chatRequest) return socket.emit('chat-rejected', `Message must be text of up to ${MAX_MSG_LENGTH} characters`)
            if (!_isChatAllowed(socket.data.clientIp)) return socket.emit('chat-rejected', 'Too many messages, please wait a moment')

            try {
                const { toyId, txt } = chatRequest
                const msg = { txt, userName: socket.data.userName, createdAt: Date.now() }
                const isAdded = await toyService.addChatMsg(toyId, msg)
                if (!isAdded) return socket.emit('chat-rejected', 'Message could not be sent')
                io.to(toyId).emit('chat-msg', msg)
            } catch (err) {
                console.error('❌ Failed to save chat:', err)
                socket.emit('chat-rejected', 'Message could not be sent')
            }
        })

        socket.on('typing', payload => {
            if (!_isPlainObject(payload) || !_hasOnlyKeys(payload, ['toyId', 'userName'])) return
            if (!_isValidToyId(payload.toyId)) return
            if (!_isAllowed(`typing:${socket.data.clientIp}`, RATE_LIMITS.typing)) return
            socket.broadcast.to(payload.toyId).emit('typing', socket.data.userName)
        })

        socket.on('disconnect', () => {
            console.log('User disconnected', socket.id)
        })
    })
}

function emitTo({ type, data, room = null }) {
    if (room) io.to(room).emit(type, data)
    else io.emit(type, data)
}

async function _getVerifiedUserName(socket) {
    const loginToken = socket.request.cookies?.loginToken
    if (!loginToken) return GUEST_NAME
    try {
        const user = await authService.getLoggedinUser(loginToken)
        return typeof user?.fullname === 'string' && user.fullname.trim() ? user.fullname : GUEST_NAME
    } catch (err) {
        console.error('Cannot verify chat user:', err)
        return GUEST_NAME
    }
}

// Rate limits are per address, not per socket, so that reconnecting does not reset them.
// Without trusted proxy headers, every visitor behind the hosting proxy shares one limit: stricter, but not spoofable.
// Only set TRUST_CF_CONNECTING_IP once a live test shows that clients cannot control this header.
// X-Forwarded-For is never used because clients can pre-fill it.
function _getClientIp(socket) {
    const cloudflareIp = socket.handshake.headers['cf-connecting-ip']
    return TRUST_CF_CONNECTING_IP && isIP(cloudflareIp) ? cloudflareIp : socket.handshake.address
}

function _parseChatRequest(payload) {
    if (!_isPlainObject(payload) || !_hasOnlyKeys(payload, ['toyId', 'msg'])) return null
    const { toyId, msg } = payload
    if (!_isValidToyId(toyId)) return null
    if (!_isPlainObject(msg) || !_hasOnlyKeys(msg, ['txt', 'userName'])) return null
    // The client still sends userName, but it is never used
    if (msg.userName !== undefined && typeof msg.userName !== 'string') return null
    if (typeof msg.txt !== 'string' || msg.txt.length > MAX_MSG_LENGTH) return null
    const txt = msg.txt.trim()
    return txt ? { toyId, txt } : null
}

function _isValidToyId(toyId) {
    return typeof toyId === 'string' && TOY_ID_REGEX.test(toyId)
}

function _isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]'
}

function _hasOnlyKeys(obj, allowedKeys) {
    return Object.keys(obj).every(key => allowedKeys.includes(key))
}

function _isChatAllowed(clientIp) {
    return _isAllowed(`chatBurst:${clientIp}`, RATE_LIMITS.chatBurst)
        && _isAllowed(`chatHour:${clientIp}`, RATE_LIMITS.chatHour)
        && _isAllowed('chatGlobal', RATE_LIMITS.chatGlobal)
}

function _isAllowed(key, { limit, windowMs }) {
    const now = Date.now()
    if (rateBuckets.size >= MAX_RATE_BUCKETS) _purgeRateBuckets(now)

    let bucket = rateBuckets.get(key)
    if (!bucket || bucket.resetAt <= now) {
        bucket = { count: 0, resetAt: now + windowMs }
        rateBuckets.set(key, bucket)
    }
    if (bucket.count >= limit) return false
    bucket.count++
    return true
}

function _purgeRateBuckets(now) {
    for (const [key, { resetAt }] of rateBuckets) {
        if (resetAt <= now) rateBuckets.delete(key)
    }
    if (rateBuckets.size >= MAX_RATE_BUCKETS) rateBuckets.clear()
}

export const socketService = {
    setup,
    emitTo,
}