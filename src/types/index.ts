import { z } from 'zod'

export const PlatformType = z.enum(['tistory', 'naver'])
export type PlatformType = z.infer<typeof PlatformType>

export const PostRequestSchema = z.object({
  userId: z.string().uuid(),
  platform: PlatformType,
  blogId: z.string(),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  visibility: z.enum(['public', 'private', 'protected']).default('public'),
})
export type PostRequest = z.infer<typeof PostRequestSchema>

export const LoginRequestSchema = z.object({
  userId: z.string().uuid(),
  platform: PlatformType,
  username: z.string().min(1),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof LoginRequestSchema>

export const SessionCheckRequestSchema = z.object({
  userId: z.string().uuid(),
  platform: PlatformType,
})
export type SessionCheckRequest = z.infer<typeof SessionCheckRequestSchema>

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export interface PostResult {
  postUrl?: string
  postId?: string
}

export interface SessionStatus {
  isValid: boolean
  expiresAt?: string
  blogName?: string
}

export interface StoredCookies {
  userId: string
  platform: PlatformType
  cookies: string
  createdAt: string
  expiresAt: string
}
