import express from 'express'
import { login, signup, logout, getCurrentUser } from './auth.controller.js'

export const authRoutes = express.Router()

authRoutes.post('/login', login)
authRoutes.post('/signup', signup)
authRoutes.post('/logout', logout)
authRoutes.get('/me', getCurrentUser)