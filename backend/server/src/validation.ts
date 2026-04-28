import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.email(),
  password: z.string().min(6).max(100),
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(100),
})

export const createTaskSchema = z.object({
  title: z.string().min(2).max(140),
  notes: z.string().max(1000).optional().default(''),
  dueDate: z.string().date().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  tags: z.array(z.string().min(1).max(30)).default([]),
})

export const patchTaskSchema = z.object({
  title: z.string().min(2).max(140).optional(),
  notes: z.string().max(1000).optional(),
  dueDate: z.union([z.string().date(), z.null()]).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['open', 'done']).optional(),
  tags: z.array(z.string().min(1).max(30)).optional(),
})

export const taskQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['all', 'open', 'done']).optional().default('all'),
  priority: z.enum(['all', 'low', 'medium', 'high']).optional().default('all'),
  tag: z.string().optional().default('all'),
  sort: z.enum(['updated_desc', 'due_asc', 'due_desc']).optional().default('updated_desc'),
})

