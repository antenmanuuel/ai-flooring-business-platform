import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import apiRouter from './routes/api.js'
import adminRouter from './routes/admin.js'
import authRouter from './routes/auth.js'

const app = express()
const PORT = Number(process.env.PORT) || 5050

app.use(cors())
app.use(express.json())
app.use(cookieParser())

app.use('/api', apiRouter)
app.use('/api/auth', authRouter)
app.use('/api/admin', adminRouter)

// Fallback 404 for unknown API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// Centralized error handler (Express identifies it by its 4 arguments)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
