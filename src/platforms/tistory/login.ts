import { Page } from 'playwright'
import { createContext } from '../../utils/browser.js'
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
    console.log('[Tistory] Starting login flow...')
    
    await page.goto(TISTORY_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })
    console.log('[Tistory] Login page loaded')

    const kakaoSelectors = [
      '.link_kakao_id',
      '.btn_login.link_kakao_id', 
      'a.link_kakao_id',
      '.login_wrap a[href*="kakao"]',
      '.btn_kakao',
      'a[class*="kakao"]:not([href="#kakaoBody"])',
    ]
    
    let clicked = false
    for (const selector of kakaoSelectors) {
      try {
        const btn = page.locator(selector).first()
        if (await btn.isVisible({ timeout: 2000 })) {
          await btn.click()
          clicked = true
          console.log('[Tistory] Clicked Kakao button with selector:', selector)
          break
        }
      } catch {
        continue
      }
    }
    
    if (!clicked) {
      const allLinks = await page.locator('a').all()
      for (const link of allLinks) {
        const text = await link.textContent().catch(() => '')
        const className = await link.getAttribute('class').catch(() => '')
        if ((text?.includes('카카오') || className?.includes('kakao')) && !text?.includes('바로가기')) {
          await link.click()
          clicked = true
          console.log('[Tistory] Clicked Kakao button by text/class search')
          break
        }
      }
    }
    
    if (!clicked) {
      throw new Error('Could not find Kakao login button')
    }

    await page.waitForURL('**/accounts.kakao.com/**', { timeout: 15000 })
    console.log('[Tistory] Kakao login page loaded')

    await page.waitForTimeout(1000)

    await page.waitForTimeout(2000)
    
    const loginIdInput = page.locator('#loginId--1, input[name="loginId"]').first()
    await loginIdInput.waitFor({ timeout: 10000 })
    await loginIdInput.click()
    await loginIdInput.pressSequentially(username, { delay: 100 })
    console.log('[Tistory] Entered username')

    await page.waitForTimeout(300)

    const passwordInput = page.locator('#password--2, input[name="password"]').first()
    await passwordInput.click()
    await passwordInput.pressSequentially(password, { delay: 100 })
    console.log('[Tistory] Entered password')

    await page.waitForTimeout(500)

    const submitButton = page.locator('button.submit, button.btn_g.highlight.submit').first()
    await submitButton.click()
    console.log('[Tistory] Clicked submit button')
    
    await page.waitForTimeout(5000)

    await Promise.race([
      page.waitForURL('**/tistory.com/**', { timeout: 30000 }),
      page.waitForURL('**/accounts.kakao.com/**', { timeout: 30000 }),
    ])

    const currentUrl = page.url()
    console.log('[Tistory] Current URL after login:', currentUrl)

    if (currentUrl.includes('accounts.kakao.com')) {
      const errorSelectors = ['.txt_error', '.error_message', '[class*="error"]', '.info_error', '#error-message']
      let errorMsg = null
      for (const sel of errorSelectors) {
        errorMsg = await page.locator(sel).textContent().catch(() => null)
        if (errorMsg) break
      }
      console.error('[Tistory] Login failed, still on Kakao. Error:', errorMsg || 'No error message found')
      console.error('[Tistory] Page title:', await page.title())
      return { isValid: false }
    }

    if (!currentUrl.includes('tistory.com')) {
      console.error('[Tistory] Unexpected redirect:', currentUrl)
      return { isValid: false }
    }

    await saveCookies(userId, 'tistory', context)
    console.log('[Tistory] Cookies saved')

    const blogName = await extractBlogName(page)

    return {
      isValid: true,
      blogName,
      expiresAt: getExpiryDate(),
    }
  } catch (error) {
    console.error('[Tistory] Login failed:', error)
    return { isValid: false }
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
    await page.goto(TISTORY_MAIN_URL, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const isLoggedIn = await page.locator('.my_tistory, .btn_my, [class*="profile"], [class*="user"]').count() > 0

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
    const blogLink = await page.locator('a[href*=".tistory.com"]').first()
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
