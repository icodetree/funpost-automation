import { chromium, Browser, BrowserContext, Page } from 'playwright'

let browser: Browser | null = null

export async function getBrowser(): Promise<Browser> {
  if (browser && browser.isConnected()) {
    return browser
  }

  const headless = process.env.HEADLESS !== 'false'
  
  browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  return browser
}

export async function createContext(cookies?: string): Promise<BrowserContext> {
  const b = await getBrowser()
  
  const context = await b.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  })

  if (cookies) {
    try {
      const parsedCookies = JSON.parse(cookies)
      await context.addCookies(parsedCookies)
    } catch (e) {
      console.error('Failed to parse cookies:', e)
    }
  }

  return context
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

export async function waitForNavigation(page: Page, url: string, timeout = 30000): Promise<void> {
  await page.waitForURL(url, { timeout })
}

export async function typeSlowly(page: Page, selector: string, text: string): Promise<void> {
  await page.click(selector)
  await page.type(selector, text, { delay: 50 })
}
