import { createContext } from '../../utils/browser.js'
import { loadCookies, saveCookies } from '../../utils/cookie-manager.js'
import type { PostRequest, PostResult } from '../../types/index.js'

interface TistoryPostOptions {
  blogId: string
  title: string
  content: string
  category?: string
  tags?: string[]
  visibility?: 'public' | 'private' | 'protected'
}

export async function postToTistory(
  userId: string,
  options: TistoryPostOptions
): Promise<PostResult> {
  const cookies = await loadCookies(userId, 'tistory')
  
  if (!cookies) {
    throw new Error('No valid session. Please login first.')
  }

  const context = await createContext(cookies)
  const page = await context.newPage()

  try {
    const writeUrl = `https://${options.blogId}.tistory.com/manage/newpost`
    await page.goto(writeUrl, { waitUntil: 'networkidle' })

    const isEditor = await page.locator('#editor, .editor-container, #tinymce').count() > 0
    if (!isEditor) {
      throw new Error('Failed to access editor. Session may have expired.')
    }

    const titleInput = page.locator('input[name="title"], #title, .title-input')
    await titleInput.fill(options.title)

    const contentFrame = page.frameLocator('iframe.editor-content, #editor-content')
    const editorBody = contentFrame.locator('body')
    
    if (await editorBody.count() > 0) {
      await editorBody.fill(options.content)
    } else {
      const directEditor = page.locator('.editor-content, #content, [contenteditable="true"]')
      await directEditor.fill(options.content)
    }

    if (options.category) {
      await selectCategory(page, options.category)
    }

    if (options.tags && options.tags.length > 0) {
      await addTags(page, options.tags)
    }

    if (options.visibility && options.visibility !== 'public') {
      await setVisibility(page, options.visibility)
    }

    await page.click('button.btn_publish, #publish-btn, button:has-text("발행")')

    await page.waitForURL('**/manage/posts**', { timeout: 30000 })

    await saveCookies(userId, 'tistory', context)

    const currentUrl = page.url()
    const postIdMatch = currentUrl.match(/\/(\d+)/)
    const postId = postIdMatch?.[1]

    return {
      postUrl: postId ? `https://${options.blogId}.tistory.com/${postId}` : undefined,
      postId,
    }
  } finally {
    await context.close()
  }
}

async function selectCategory(page: import('playwright').Page, category: string): Promise<void> {
  try {
    await page.click('.category-select, #category, button:has-text("카테고리")')
    await page.click(`text=${category}`)
  } catch {
    console.warn('Failed to select category:', category)
  }
}

async function addTags(page: import('playwright').Page, tags: string[]): Promise<void> {
  try {
    const tagInput = page.locator('input[name="tag"], .tag-input, #tag-input')
    for (const tag of tags) {
      await tagInput.fill(tag)
      await page.keyboard.press('Enter')
    }
  } catch {
    console.warn('Failed to add tags')
  }
}

async function setVisibility(page: import('playwright').Page, visibility: 'private' | 'protected'): Promise<void> {
  try {
    await page.click('.visibility-select, #visibility')
    if (visibility === 'private') {
      await page.click('text=비공개')
    } else if (visibility === 'protected') {
      await page.click('text=보호')
    }
  } catch {
    console.warn('Failed to set visibility:', visibility)
  }
}

export async function createTistoryPost(request: PostRequest): Promise<PostResult> {
  return postToTistory(request.userId, {
    blogId: request.blogId,
    title: request.title,
    content: request.content,
    category: request.category,
    tags: request.tags,
    visibility: request.visibility,
  })
}
