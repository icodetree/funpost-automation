import { BrowserContext } from 'playwright'
import { getSupabase } from './supabase.js'
import type { PlatformType } from '../types/index.js'

const COOKIE_EXPIRY_DAYS = 7

export async function saveCookies(
  userId: string,
  platform: PlatformType,
  context: BrowserContext
): Promise<void> {
  const supabase = getSupabase()
  const cookies = await context.cookies()
  const cookiesJson = JSON.stringify(cookies)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + COOKIE_EXPIRY_DAYS)

  const { error } = await supabase
    .from('platform_sessions')
    .upsert({
      user_id: userId,
      platform,
      cookies: cookiesJson,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,platform',
    })

  if (error) {
    console.error('Failed to save cookies:', error)
    throw new Error('Failed to save session')
  }
}

export async function loadCookies(
  userId: string,
  platform: PlatformType
): Promise<string | null> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('platform_sessions')
    .select('cookies, expires_at')
    .eq('user_id', userId)
    .eq('platform', platform)
    .single()

  if (error || !data) {
    return null
  }

  const expiresAt = new Date(data.expires_at)
  if (expiresAt < new Date()) {
    await deleteCookies(userId, platform)
    return null
  }

  return data.cookies
}

export async function deleteCookies(
  userId: string,
  platform: PlatformType
): Promise<void> {
  const supabase = getSupabase()

  await supabase
    .from('platform_sessions')
    .delete()
    .eq('user_id', userId)
    .eq('platform', platform)
}

export async function hasValidSession(
  userId: string,
  platform: PlatformType
): Promise<boolean> {
  const cookies = await loadCookies(userId, platform)
  return cookies !== null
}

function validateCookieFormat(cookiesJson: string): { valid: boolean; error?: string } {
  try {
    const parsed = JSON.parse(cookiesJson)
    if (!Array.isArray(parsed)) {
      return { valid: false, error: 'Cookies must be an array' }
    }
    if (parsed.length === 0) {
      return { valid: false, error: 'Cookies array is empty' }
    }
    const firstCookie = parsed[0]
    if (!firstCookie.name || !firstCookie.value) {
      return { valid: false, error: 'Invalid cookie format. Each cookie must have "name" and "value" properties' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid JSON format' }
  }
}

export async function saveManualCookies(
  userId: string,
  platform: PlatformType,
  cookiesJson: string
): Promise<void> {
  const validation = validateCookieFormat(cookiesJson)
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid cookie format')
  }

  const supabase = getSupabase()

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + COOKIE_EXPIRY_DAYS)

  const { error } = await supabase
    .from('platform_sessions')
    .upsert({
      user_id: userId,
      platform,
      cookies: cookiesJson,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,platform',
    })

  if (error) {
    console.error('Failed to save manual cookies:', error)
    throw new Error('Failed to save session')
  }
}
