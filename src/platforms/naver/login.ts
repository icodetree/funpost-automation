import { createContext, typeSlowly } from '../../utils/browser.js'
import { saveCookies, loadCookies } from '../../utils/cookie-manager.js'
import type { SessionStatus } from '../../types/index.js'

const NAVER_LOGIN_URL = 'https://nid.naver.com/nidlogin.login'
const NAVER_BLOG_URL = 'https://blog.naver.com'

export async function loginNaver(
  userId: string,
  username: string,
  password: string
): Promise<SessionStatus> {
  const context = await createContext()
  const page = await context.newPage()

  try {
    await page.goto(NAVER_LOGIN_URL, { waitUntil: 'networkidle' })

    await typeSlowly(page, '#id', username)
    await typeSlowly(page, '#pw', password)

    await page.click('.btn_login, #log\\.login')

    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    if (currentUrl.includes('nidlogin.login')) {
      const captchaExists = await page.locator('#captcha, .captcha').count() > 0
      if (captchaExists) {
        throw new Error('CAPTCHA detected. Manual login required.')
      }
      throw new Error('Login failed. Please check credentials.')
    }

    await page.goto(NAVER_BLOG_URL, { waitUntil: 'networkidle' })

    await saveCookies(userId, 'naver', context)

    const blogId = await extractBlogId(page)

    return {
      isValid: true,
      blogName: blogId,
      expiresAt: getExpiryDate(),
    }
  } catch (error) {
    console.error('Naver login failed:', error)
    if (error instanceof Error) {
      throw error
    }
    return { isValid: false }
  } finally {
    await context.close()
  }
}

export async function checkNaverSession(userId: string): Promise<SessionStatus> {
  const cookies = await loadCookies(userId, 'naver')
  
  if (!cookies) {
    return { isValid: false }
  }

  const context = await createContext(cookies)
  const page = await context.newPage()

  try {
    await page.goto(NAVER_BLOG_URL, { waitUntil: 'networkidle' })

    const isLoggedIn = await page.locator('.gnb_my, .MyView').count() > 0

    if (!isLoggedIn) {
      return { isValid: false }
    }

    const blogId = await extractBlogId(page)

    return {
      isValid: true,
      blogName: blogId,
      expiresAt: getExpiryDate(),
    }
  } catch {
    return { isValid: false }
  } finally {
    await context.close()
  }
}

async function extractBlogId(page: import('playwright').Page): Promise<string | undefined> {
  try {
    const blogLink = await page.locator('a[href*="/PostList.naver"]').first()
    const href = await blogLink.getAttribute('href')
    if (href) {
      const match = href.match(/blogId=([^&]+)/)
      return match?.[1]
    }
  } catch {
    return undefined
  }
  return undefined
}

function getExpiryDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toISOString()
}
