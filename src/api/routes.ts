import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { 
  PostRequestSchema, 
  LoginRequestSchema, 
  SessionCheckRequestSchema,
  PlatformType
} from '../types/index.js'
import { 
  loginTistory, 
  checkTistorySession, 
  createTistoryPost 
} from '../platforms/tistory/index.js'
import { 
  loginNaver, 
  checkNaverSession, 
  createNaverPost 
} from '../platforms/naver/index.js'
import { saveManualCookies } from '../utils/cookie-manager.js'
import type { ApiResponse, PostResult, SessionStatus } from '../types/index.js'

const SaveCookiesSchema = z.object({
  userId: z.string().uuid(),
  platform: PlatformType,
  cookies: z.string().min(1),
})

export const router = Router()

router.get('/health', (_req: Request, res: Response): void => {
  res.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() } })
})

function verifyApiKey(req: Request, res: Response, next: () => void): void {
  const apiKey = req.headers['x-api-key']
  const expectedKey = process.env.API_SECRET_KEY

  if (!expectedKey) {
    res.status(500).json({ success: false, error: 'Server configuration error' })
    return
  }

  if (apiKey !== expectedKey) {
    res.status(401).json({ success: false, error: 'Invalid API key' })
    return
  }

  next()
}

router.use(verifyApiKey)

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = LoginRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ 
        success: false, 
        error: parsed.error.errors.map(e => e.message).join(', ')
      })
      return
    }

    const { userId, platform, username, password } = parsed.data

    let result: SessionStatus

    if (platform === 'tistory') {
      result = await loginTistory(userId, username, password)
    } else if (platform === 'naver') {
      result = await loginNaver(userId, username, password)
    } else {
      res.status(400).json({ success: false, error: 'Unsupported platform' })
      return
    }

    const response: ApiResponse<SessionStatus> = {
      success: result.isValid,
      data: result,
      error: result.isValid ? undefined : 'Login failed',
    }

    res.json(response)
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

router.post('/session/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = SessionCheckRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ 
        success: false, 
        error: parsed.error.errors.map(e => e.message).join(', ')
      })
      return
    }

    const { userId, platform } = parsed.data

    let result: SessionStatus

    if (platform === 'tistory') {
      result = await checkTistorySession(userId)
    } else if (platform === 'naver') {
      result = await checkNaverSession(userId)
    } else {
      res.status(400).json({ success: false, error: 'Unsupported platform' })
      return
    }

    const response: ApiResponse<SessionStatus> = {
      success: true,
      data: result,
    }

    res.json(response)
  } catch (error) {
    console.error('Session check error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

router.post('/post', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = PostRequestSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ 
        success: false, 
        error: parsed.error.errors.map(e => e.message).join(', ')
      })
      return
    }

    const postRequest = parsed.data
    let result: PostResult

    if (postRequest.platform === 'tistory') {
      result = await createTistoryPost(postRequest)
    } else if (postRequest.platform === 'naver') {
      result = await createNaverPost(postRequest)
    } else {
      res.status(400).json({ success: false, error: 'Unsupported platform' })
      return
    }

    const response: ApiResponse<PostResult> = {
      success: true,
      data: result,
    }

    res.json(response)
  } catch (error) {
    console.error('Post error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})

router.post('/cookies/save', async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = SaveCookiesSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ 
        success: false, 
        error: parsed.error.errors.map(e => e.message).join(', ')
      })
      return
    }

    const { userId, platform, cookies } = parsed.data

    await saveManualCookies(userId, platform, cookies)

    res.json({ 
      success: true, 
      data: { message: 'Cookies saved successfully' } 
    })
  } catch (error) {
    console.error('Save cookies error:', error)
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error'
    })
  }
})
