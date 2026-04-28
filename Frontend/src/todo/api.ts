import type { AiSuggestion, TodoItem, TodoPriority, TodoStatus } from './types'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const TOKEN_KEY = 'ai-todo:token'
const USER_KEY = 'ai-todo:user'

export type AuthUser = {
  id: string
  name: string
  email: string
}

type TaskDto = {
  id: string
  title: string
  notes: string
  dueDate: string | null
  priority: TodoPriority
  status: TodoStatus
  tags: string[]
  createdAt: string
  updatedAt: string
}

function toTodo(task: TaskDto): TodoItem {
  return {
    ...task,
    dueDate: task.dueDate ?? undefined,
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown network error'
    throw new Error(`تعذر الاتصال بالسيرفر (${API_BASE}). تأكد إن backend شغال. السبب: ${reason}`)
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // noop
    }
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function loadAuth() {
  const token = localStorage.getItem(TOKEN_KEY)
  const userRaw = localStorage.getItem(USER_KEY)
  if (!token || !userRaw) return null
  try {
    const user = JSON.parse(userRaw) as AuthUser
    return { token, user }
  } catch {
    return null
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export async function register(input: { name: string; email: string; password: string }) {
  return request<{ token: string; user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function login(input: { email: string; password: string }) {
  return request<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchTasks(
  token: string,
  query: { q?: string; status?: string; priority?: string; tag?: string; sort?: string },
) {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.status) params.set('status', query.status)
  if (query.priority) params.set('priority', query.priority)
  if (query.tag) params.set('tag', query.tag)
  if (query.sort) params.set('sort', query.sort)

  const tasks = await request<TaskDto[]>(`/tasks?${params.toString()}`, {}, token)
  return tasks.map(toTodo)
}

export async function createTask(
  token: string,
  input: { title: string; notes?: string; dueDate?: string; priority: TodoPriority; tags: string[] },
) {
  const task = await request<TaskDto>(
    '/tasks',
    { method: 'POST', body: JSON.stringify(input) },
    token,
  )
  return toTodo(task)
}

export async function patchTask(
  token: string,
  id: string,
  input: Partial<{ title: string; notes: string; dueDate: string | null; priority: TodoPriority; status: TodoStatus; tags: string[] }>,
) {
  const task = await request<TaskDto>(
    `/tasks/${id}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    token,
  )
  return toTodo(task)
}

export async function deleteTask(token: string, id: string) {
  await request<void>(`/tasks/${id}`, { method: 'DELETE' }, token)
}

export async function fetchSuggestions(token: string) {
  return request<AiSuggestion[]>('/ai/suggestions', { method: 'POST' }, token)
}

