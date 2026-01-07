import { createContext } from '../../utils/browser.js'
import { loadCookies, saveCookies } from '../../utils/cookie-manager.js'
import type { PostRequest, PostResult } from '../../types/index.js'

interface NaverPostOptions {
  blogId: string
  title: string
  content: string
  category?: string
  tags?: string[]
  visibility?: 'public' | 'private' | 'protected'
}

export async function postToNaver(
  userId: string,
  options: NaverPostOptions
): Promise<PostResult> {
  const cookies = await loadCookies(userId, 'naver')
  
  if (!cookies) {
    throw new Error('No valid session. Please login first.')
  }

  const context = await createContext(cookies)
  const page = await context.newPage()

  try {
    const writeUrl = 'https://blog.naver.com/PostWriteForm.naver'
    await page.goto(writeUrl, { waitUntil: 'networkidle' })

    await page.waitForTimeout(2000)

    const titleInput = page.locator('.se-title-text, input[name="title"], #title')
    await titleInput.fill(options.title)

    const editorFrame = page.frameLocator('iframe.se-viewer-content, #mainFrame')
    const editorBody = editorFrame.locator('.se-text-paragraph, body')
    
    if (await editorBody.count() > 0) {
      await editorBody.click()
      await page.keyboard.type(options.content)
    } else {
      const smartEditor = page.locator('.se-text-paragraph, [contenteditable="true"]')
      await smartEditor.fill(options.content)
    }

    if (options.category) {
      await selectCategory(page, options.category)
    }

    if (options.tags && options.tags.length > 0) {
      await addTags(page, options.tags)
    }

    if (options.visibility === 'private') {
      await setPrivate(page)
    }

    await page.click('button.publish_btn, .se-publish-btn, button:has-text("발행")')

    await page.waitForURL('**/*.naver', { timeout: 30000 })

    await saveCookies(userId, 'naver', context)

    const currentUrl = page.url()
    const logNoMatch = currentUrl.match(/logNo=(\d+)/)
    const postId = logNoMatch?.[1]

    return {
      postUrl: postId ? `https://blog.naver.com/${options.blogId}/${postId}` : undefined,
      postId,
    }
  } finally {
    await context.close()
  }
}

async function selectCategory(page: import('playwright').Page, category: string): Promise<void> {
  try {
    await page.click('.category_btn, button:has-text("카테고리")')
    await page.click(`text=${category}`)
  } catch {
    console.warn('Failed to select category:', category)
  }
}

async function addTags(page: import('playwright').Page, tags: string[]): Promise<void> {
  try {
    const tagInput = page.locator('.tag_input, input[name="tag"]')
    for (const tag of tags) {
      await tagInput.fill(tag)
      await page.keyboard.press('Enter')
    }
  } catch {
    console.warn('Failed to add tags')
  }
}

async function setPrivate(page: import('playwright').Page): Promise<void> {
  try {
    await page.click('.setting_btn, button:has-text("공개")')
    await page.click('text=비공개')
  } catch {
    console.warn('Failed to set private')
  }
}

export async function createNaverPost(request: PostRequest): Promise<PostResult> {
  return postToNaver(request.userId, {
    blogId: request.blogId,
    title: request.title,
    content: request.content,
    category: request.category,
    tags: request.tags,
    visibility: request.visibility,
  })
}
