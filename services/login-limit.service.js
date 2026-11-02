import { isIP } from 'net'

const TRUST_CF_CONNECTING_IP = process.env.NODE_ENV === 'production' && process.env.TRUST_CF_CONNECTING_IP === 'true'
const WINDOW_MS = 15 * 60 * 1000
const ACCOUNT_LIMIT = 10
const IP_LIMIT = 20
const GLOBAL_LIMIT = 100
const MAX_ACCOUNT_KEY_LENGTH = 128

const buckets = new Map()

export const loginLimitService = {
    startAttempt,
}

// Attempts are counted before the password is checked, so parallel requests cannot slip past the limit.
// Unknown usernames count exactly like real ones, so the limit does not reveal which accounts exist.
function startAttempt(username, req) {
    const now = Date.now()
    _purgeExpired(now)

    const limits = _getLimits(username, req)
    const blocked = limits
        .map(({ key, limit }) => ({ bucket: buckets.get(key), limit }))
        .filter(({ bucket, limit }) => bucket && bucket.count >= limit)
    if (blocked.length) {
        const resetAt = Math.max(...blocked.map(({ bucket }) => bucket.resetAt))
        return { retryAfterSeconds: Math.ceil((resetAt - now) / 1000) }
    }

    limits.forEach(({ key }) => {
        const bucket = buckets.get(key) || { count: 0, resetAt: now + WINDOW_MS }
        bucket.count++
        buckets.set(key, bucket)
    })
    const accountKey = limits.find(({ key }) => key.startsWith('account:'))?.key

    return {
        // A correct password clears that account's failures and is not counted anywhere else
        succeed() {
            if (accountKey) buckets.delete(accountKey)
            limits.forEach(({ key }) => _refund(key))
        },
        // A database failure says nothing about the password, so it must not lock anyone out
        abort() {
            limits.forEach(({ key }) => _refund(key))
        },
    }
}

// The hosting proxy hides the client address, and clients can fill in forwarding headers themselves.
// So the account and global limits never depend on the address: a spoofed header cannot get around them.
function _getLimits(username, req) {
    const limits = [{ key: 'global', limit: GLOBAL_LIMIT }]
    if (typeof username === 'string') {
        limits.push({ key: `account:${username.trim().toLowerCase().slice(0, MAX_ACCOUNT_KEY_LENGTH)}`, limit: ACCOUNT_LIMIT })
    }
    const cloudflareIp = req.headers['cf-connecting-ip']
    if (TRUST_CF_CONNECTING_IP && isIP(cloudflareIp)) limits.push({ key: `ip:${cloudflareIp}`, limit: IP_LIMIT })
    return limits
}

function _refund(key) {
    const bucket = buckets.get(key)
    if (bucket && bucket.count > 0) bucket.count--
}

function _purgeExpired(now) {
    for (const [key, { resetAt }] of buckets) {
        if (resetAt <= now) buckets.delete(key)
    }
}
