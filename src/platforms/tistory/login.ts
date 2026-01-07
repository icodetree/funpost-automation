import { Page } from 'playwright'
import { createContext, typeSlowly } from '../../utils/browser.js'
import { saveCookies, loadCookies } from '../../utils/cookie-manager.js'
import type { SessionStatus } from '../../types/index.js'

const TISTORY_LOGIN_URL = 'https://www.tistory.com/auth/login'
const TISTORY_MAIN_URL = 'https://www.tistory.com'

export async function loginTistory(
  userId: string,
  username: string,
  password: string
): Promise<SessionStatus> {
  const context = await createContext()
  const page = await context.newPage()

  try {
    await page.goto(TISTORY_LOGIN_URL, { waitUntil: 'networkidle' })

    await page.click('a.btn_login.link_kakao_id')
    await page.waitForURL('**/accounts.kakao.com/**', { timeout: 10000 })

    await typeSlowly(page, 'input[name="loginId"]', username)
    await typeSlowly(page, 'input[name="password"]', password)

    await page.click('button[type="submit"]')

    await page.waitForURL(`${TISTORY_MAIN_URL}/**`, { timeout: 30000 })

    await saveCookies(userId, 'tistory', context)

    const blogName = await extractBlogName(page)

    return {
      isValid: true,
      blogName,
      expiresAt: getExpiryDate(),
    }
  } catch (error) {
    console.error('Tistory login failed:', error)
    return {
      isValid: false,
    }
  } finally {
    await context.close()
  }
}

export async function checkTistorySession(userId: string): Promise<SessionStatus> {
  const cookies = await loadCookies(userId, 'tistory')
  
  if (!cookies) {
    return { isValid: false }
  }

  const context = await createContext(cookies)
  const page = await context.newPage()

  try {
    await page.goto(TISTORY_MAIN_URL, { waitUntil: 'networkidle' })

    const isLoggedIn = await page.locator('.my_tistory, .btn_my').count() > 0

    if (!isLoggedIn) {
      return { isValid: false }
    }

    const blogName = await extractBlogName(page)

    return {
      isValid: true,
      blogName,
      expiresAt: getExpiryDate(),
    }
  } catch {
    return { isValid: false }
  } finally {
    await context.close()
  }
}

async function extractBlogName(page: Page): Promise<string | undefined> {
  try {
    const blogLink = await page.locator('.my_tistory a, .btn_my').first()
    const href = await blogLink.getAttribute('href')
    if (href) {
      const match = href.match(/https?:\/\/([^.]+)\.tistory\.com/)
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
