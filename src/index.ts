import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { router } from './api/routes.js'
import { closeBrowser } from './utils/browser.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}))

app.use(express.json())

app.use('/api', router)

app.get('/', (_req, res) => {
  res.json({
    name: 'FunPost Automation Server',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      login: 'POST /api/login',
      sessionCheck: 'POST /api/session/check',
      post: 'POST /api/post',
    },
  })
})

const server = app.listen(PORT, () => {
  console.log(`🚀 FunPost Automation Server running on port ${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`)
})

async function gracefulShutdown(): Promise<void> {
  console.log('\n🛑 Shutting down gracefully...')
  
  await closeBrowser()
  
  server.close(() => {
    console.log('👋 Server closed')
    process.exit(0)
  })

  setTimeout(() => {
    console.error('⚠️ Forced shutdown after timeout')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
