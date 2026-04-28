import cors from 'cors'
import bcrypt from 'bcryptjs'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import { ZodError } from 'zod'
import { authGuard, createToken } from './auth'
import { createTaskSuggestions } from './ai'
import { createTaskSchema, loginSchema, patchTaskSchema, registerSchema, taskQuerySchema } from './validation'

const prisma = new PrismaClient()
const app = express()
const port = Number(process.env.PORT ?? 4000)

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  }),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/auth/register', async (req, res) => {
  const input = registerSchema.parse(req.body)
  const exists = await prisma.user.findUnique({ where: { email: input.email } })
  if (exists) return res.status(409).json({ error: 'Email already in use' })

  const passwordHash = await bcrypt.hash(input.password, 10)
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash,
    },
  })
  const token = createToken({ sub: user.id, email: user.email })
  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  })
})

app.post('/api/auth/login', async (req, res) => {
  const input = loginSchema.parse(req.body)
  const user = await prisma.user.findUnique({ where: { email: input.email } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(input.password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = createToken({ sub: user.id, email: user.email })
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
  })
})

app.get('/api/tasks', authGuard, async (req, res) => {
  const q = taskQuerySchema.parse(req.query)
  const tasks = await prisma.task.findMany({
    where: { userId: req.user!.id },
    orderBy: q.sort === 'updated_desc' ? { updatedAt: 'desc' } : undefined,
  })

  const filtered = tasks
    .filter((t) => (q.status === 'all' ? true : t.status === q.status))
    .filter((t) => (q.priority === 'all' ? true : t.priority === q.priority))
    .filter((t) => {
      if (q.tag === 'all') return true
      return t.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean)
        .includes(q.tag)
    })
    .filter((t) => {
      if (!q.q) return true
      const text = `${t.title}\n${t.notes}\n${t.tags}`.toLowerCase()
      return text.includes(q.q.toLowerCase())
    })
    .sort((a, b) => {
      if (q.sort === 'due_asc') {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
        return ad - bd
      }
      if (q.sort === 'due_desc') {
        const ad = a.dueDate ? new Date(a.dueDate).getTime() : -Infinity
        const bd = b.dueDate ? new Date(b.dueDate).getTime() : -Infinity
        return bd - ad
      }
      return 0
    })

  res.json(
    filtered.map((t) => ({
      ...t,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      tags: t.tags
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
    })),
  )
})

app.post('/api/tasks', authGuard, async (req, res) => {
  const input = createTaskSchema.parse(req.body)
  const created = await prisma.task.create({
    data: {
      title: input.title,
      notes: input.notes,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      priority: input.priority,
      status: 'open',
      tags: input.tags.join(','),
      userId: req.user!.id,
    },
  })
  res.status(201).json({
    ...created,
    dueDate: created.dueDate ? created.dueDate.toISOString().slice(0, 10) : null,
    tags: input.tags,
  })
})

app.patch('/api/tasks/:id', authGuard, async (req, res) => {
  const data = patchTaskSchema.parse(req.body)
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== req.user!.id) return res.status(404).json({ error: 'Task not found' })

  const updated = await prisma.task.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      notes: data.notes,
      dueDate: data.dueDate === undefined ? undefined : data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      status: data.status,
      tags: data.tags ? data.tags.join(',') : undefined,
    },
  })
  res.json({
    ...updated,
    dueDate: updated.dueDate ? updated.dueDate.toISOString().slice(0, 10) : null,
    tags: updated.tags
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean),
  })
})

app.delete('/api/tasks/:id', authGuard, async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } })
  if (!existing || existing.userId !== req.user!.id) return res.status(404).json({ error: 'Task not found' })
  await prisma.task.delete({ where: { id: existing.id } })
  res.status(204).send()
})

app.post('/api/ai/suggestions', authGuard, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.user!.id },
    orderBy: { updatedAt: 'desc' },
  })
  const suggestions = createTaskSuggestions(tasks)
  res.json(suggestions)
})

app.use((err: unknown, _req: express.Request, res: express.Response) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      issues: err.issues.map((x) => ({ path: x.path.join('.'), message: x.message })),
    })
  }
  if (err instanceof Error) return res.status(500).json({ error: err.message })
  return res.status(500).json({ error: 'Unknown server error' })
})

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`)
})

