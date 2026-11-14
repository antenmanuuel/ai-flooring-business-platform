import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import apiRouter from './routes/api.ts'

const app = express()
const PORT = Number(process.env.PORT) || 5050

app.use(cors())
app.use(express.json())

app.use('/api', apiRouter)

// Fallback 404 for unknown API routes
app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' })
})

// Centralized error handler (Express identifies it by its 4 arguments)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
