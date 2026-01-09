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
    console.log('[Tistory Post] Navigating to:', writeUrl)
    
    await page.goto(writeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    const currentUrl = page.url()
    console.log('[Tistory Post] Current URL after navigation:', currentUrl)
    
    if (currentUrl.includes('/login') || currentUrl.includes('accounts.kakao.com')) {
      throw new Error('Session expired. Please re-login to Tistory.')
    }

    await page.waitForTimeout(3000)

    const pageContent = await page.content()
    console.log('[Tistory Post] Page title:', await page.title())
    console.log('[Tistory Post] Has editor elements:', pageContent.includes('editor'))

    const editorSelectors = [
      '#editor',
      '.editor-container', 
      '#tinymce',
      '.CodeMirror',
      '#editorContent',
      '.tistory-editor',
      'textarea#content',
      '[class*="editor"]',
    ]
    
    let editorFound = false
    for (const selector of editorSelectors) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        console.log('[Tistory Post] Found editor with selector:', selector)
        editorFound = true
        break
      }
    }

    if (!editorFound) {
      console.error('[Tistory Post] No editor found. Page HTML (first 2000 chars):', pageContent.substring(0, 2000))
      throw new Error('Failed to access editor. Session may have expired.')
    }

    const titleSelectors = [
      'input[name="title"]',
      '#title',
      '.title-input',
      'input.title',
      '#post-title',
    ]
    
    for (const selector of titleSelectors) {
      const titleInput = page.locator(selector).first()
      if (await titleInput.count() > 0) {
        await titleInput.fill(options.title)
        console.log('[Tistory Post] Title filled with selector:', selector)
        break
      }
    }

    const contentFrame = page.frameLocator('iframe.editor-content, #editor-content, iframe')
    const editorBody = contentFrame.locator('body')
    
    if (await editorBody.count() > 0) {
      await editorBody.fill(options.content)
      console.log('[Tistory Post] Content filled via iframe')
    } else {
      const directEditorSelectors = [
        '.editor-content',
        '#content',
        '[contenteditable="true"]',
        'textarea#content',
        '.CodeMirror textarea',
      ]
      
      for (const selector of directEditorSelectors) {
        const editor = page.locator(selector).first()
        if (await editor.count() > 0) {
          await editor.fill(options.content)
          console.log('[Tistory Post] Content filled with selector:', selector)
          break
        }
      }
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

    const publishSelectors = [
      'button.btn_publish',
      '#publish-btn',
      'button:has-text("발행")',
      'button:has-text("저장")',
      '.btn_save',
    ]
    
    for (const selector of publishSelectors) {
      const btn = page.locator(selector).first()
      if (await btn.count() > 0) {
        await btn.click()
        console.log('[Tistory Post] Clicked publish button with selector:', selector)
        break
      }
    }

    await page.waitForTimeout(5000)

    await saveCookies(userId, 'tistory', context)

    const finalUrl = page.url()
    console.log('[Tistory Post] Final URL:', finalUrl)
    
    const postIdMatch = finalUrl.match(/\/(\d+)/)
    const postId = postIdMatch?.[1]

    return {
      postUrl: postId ? `https://${options.blogId}.tistory.com/${postId}` : finalUrl,
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
    console.warn('[Tistory Post] Failed to select category:', category)
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
    console.warn('[Tistory Post] Failed to add tags')
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
    console.warn('[Tistory Post] Failed to set visibility:', visibility)
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
