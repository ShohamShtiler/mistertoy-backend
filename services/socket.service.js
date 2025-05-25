import { Server } from 'socket.io'
import { toyService } from '../api/toy/toy.service.js'

let io = null

function setup(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
        },
    })

    io.on('connection', socket => {
        console.log('User connected', socket.id)

        socket.on('join-toy', toyId => {
            socket.join(toyId)
            console.log(`Socket ${socket.id} joined toy room ${toyId}`)
        })

        socket.on('chat-msg', async ({ toyId, msg }) => {
            try {
                await toyService.addChatMsg(toyId, msg)
                io.to(toyId).emit('chat-msg', msg)
            } catch (err) {
                console.error('❌ Failed to save chat:', err)
            }
        })

        socket.on('typing', ({ toyId, userName }) => {
            socket.broadcast.to(toyId).emit('typing', userName)
        })

        socket.on('admin-updated', msg => {
            io.emit('admin-updated', msg)
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

export const socketService = {
    setup,
    emitTo,
}