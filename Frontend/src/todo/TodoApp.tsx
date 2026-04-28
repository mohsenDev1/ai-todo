import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './TodoApp.module.css'
import type { AiSuggestion, TodoFilters, TodoItem, TodoPriority } from './types'
import {
  clearAuth,
  createTask,
  deleteTask,
  fetchSuggestions,
  fetchTasks,
  loadAuth,
  login,
  patchTask,
  register,
  saveAuth,
  type AuthUser,
} from './api'

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/\s+/g, '-')
}

function formatPriority(p: TodoPriority) {
  if (p === 'high') return 'عالية'
  if (p === 'medium') return 'وسط'
  return 'واطي'
}

function priorityBadgeClass(p: TodoPriority, stylesMap: Record<string, string>) {
  if (p === 'high') return `${stylesMap.priorityBadge} ${stylesMap.priorityHigh}`
  if (p === 'medium') return `${stylesMap.priorityBadge} ${stylesMap.priorityMedium}`
  return `${stylesMap.priorityBadge} ${stylesMap.priorityLow}`
}

const defaultFilters: TodoFilters = {
  query: '',
  status: 'all',
  tag: 'all',
  priority: 'all',
}

export function TodoApp() {
  const initialAuth = loadAuth()
  const [token, setToken] = useState<string | null>(initialAuth?.token ?? null)
  const [user, setUser] = useState<AuthUser | null>(initialAuth?.user ?? null)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [filters, setFilters] = useState<TodoFilters>(defaultFilters)
  const [sort, setSort] = useState<'updated_desc' | 'due_asc' | 'due_desc'>('updated_desc')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [draftTitle, setDraftTitle] = useState('')
  const [draftNotes, setDraftNotes] = useState('')
  const [draftDue, setDraftDue] = useState('')
  const [draftPriority, setDraftPriority] = useState<TodoPriority>('medium')
  const [draftTags, setDraftTags] = useState('')

  const titleRef = useRef<HTMLInputElement | null>(null)
  const suggestionsRef = useRef<HTMLDivElement | null>(null)

  const refreshData = useCallback(async (currentToken: string, silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const items = await fetchTasks(currentToken, {
        q: filters.query,
        status: filters.status,
        priority: filters.priority,
        tag: filters.tag,
        sort,
      })
      setTodos(items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tasks')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [filters.query, filters.status, filters.priority, filters.tag, sort])

  useEffect(() => {
    if (!token) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshData(token)
  }, [token, refreshData])

  const tagsInUse = useMemo(() => {
    const set = new Set<string>()
    for (const t of todos) for (const tag of t.tags) set.add(tag)
    return Array.from(set).sort()
  }, [todos])

  const openCount = useMemo(() => todos.filter((t) => t.status === 'open').length, [todos])
  const doneCount = useMemo(() => todos.filter((t) => t.status === 'done').length, [todos])

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

  async function submitAuth() {
    setLoading(true)
    setError('')
    try {
      const payload =
        authMode === 'register'
          ? await register({ name: authName.trim(), email: authEmail.trim(), password: authPassword })
          : await login({ email: authEmail.trim(), password: authPassword })
      setToken(payload.token)
      setUser(payload.user)
      saveAuth(payload.token, payload.user)
      setAuthPassword('')
      await refreshData(payload.token, true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  async function addTodo() {
    const title = draftTitle.trim()
    if (!title) return
    if (!token) return
    const tags =
      draftTags.trim().length === 0
        ? []
        : Array.from(new Set(draftTags.split(',').map((t) => normalizeTag(t)).filter(Boolean)))
    setLoading(true)
    setError('')
    try {
      const created = await createTask(token, {
        title,
        notes: draftNotes.trim(),
        dueDate: draftDue.trim() || undefined,
        priority: draftPriority,
        tags,
      })
      setTodos((prev) => [created, ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
    setDraftTitle('')
    setDraftNotes('')
    setDraftDue('')
    setDraftPriority('medium')
    setDraftTags('')
    titleRef.current?.focus()
  }

  function focusNewTaskInput() {
    titleRef.current?.focus()
    titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function talkWithAi() {
    suggestionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    void refreshSuggestions()
  }

  async function toggleDone(id: string) {
    if (!token) return
    const current = todos.find((t) => t.id === id)
    if (!current) return
    const next = current.status === 'done' ? 'open' : 'done'
    try {
      const updated = await patchTask(token, id, { status: next })
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update task')
    }
  }

  async function removeTodo(id: string) {
    if (!token) return
    try {
      await deleteTask(token, id)
      setTodos((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task')
    }
  }

  async function refreshSuggestions() {
    if (!token) return
    setSuggestionsLoading(true)
    try {
      const data = await fetchSuggestions(token)
      setSuggestions(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch suggestions')
    } finally {
      setSuggestionsLoading(false)
    }
  }

  async function applySuggestion(s: AiSuggestion) {
    if (!token) return
    try {
      if (s.action.kind === 'set_priority') {
        await patchTask(token, s.action.taskId, { priority: s.action.priority })
      } else if (s.action.kind === 'set_due_date') {
        await patchTask(token, s.action.taskId, { dueDate: s.action.dueDate })
      } else if (s.action.kind === 'add_tag') {
        const task = todos.find((t) => t.id === s.action.taskId)
        if (!task) return
        const tags = Array.from(new Set([...task.tags, normalizeTag(s.action.tag)]))
        await patchTask(token, s.action.taskId, { tags })
      }
      await refreshData(token, true)
      await refreshSuggestions()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply suggestion')
    }
  }

  function logout() {
    clearAuth()
    setToken(null)
    setUser(null)
    setTodos([])
    setSuggestions([])
  }

  if (!token || !user) {
    return (
      <div className={styles.page} dir="rtl" lang="ar">
        <div className={styles.shell} style={{ gridTemplateColumns: '1fr', maxWidth: 560 }}>
          <div className={styles.card}>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>Smart Task Planner</h1>
                <p className={styles.subtitle}>سجّل دخولك عشان تبدي ترتّب مهامك</p>
              </div>
              <span className={styles.pill}>Auth + API + DB</span>
            </div>
            <div className={styles.content}>
              {authMode === 'register' ? (
                <div className={styles.row}>
                  <input
                    className={styles.input}
                    placeholder="اسمك"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                </div>
              ) : null}
              <div className={styles.row} style={{ marginTop: 10 }}>
                <input
                  className={styles.input}
                  type="email"
                  placeholder="email@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                />
              </div>
              <div className={styles.row} style={{ marginTop: 10 }}>
                <input
                  className={styles.input}
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                />
              </div>
              {error ? (
                <p className={styles.muted} style={{ color: '#fecaca', marginTop: 10 }}>
                  {error}
                </p>
              ) : null}
              <div className={styles.footerRow}>
                <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={submitAuth} disabled={loading}>
                  {authMode === 'register' ? 'سوّ حساب' : 'دخول'}
                </button>
                <button className={styles.btn} type="button" onClick={() => setAuthMode((m) => (m === 'login' ? 'register' : 'login'))}>
                  {authMode === 'register' ? 'عندي حساب' : 'حساب يديد'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page} dir="rtl" lang="ar">
      <div className={styles.shell}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>مهامي اليوم</h1>
              <p className={styles.subtitle}>
                {openCount} للحين • {doneCount} خلصت
              </p>
            </div>
            <div className={styles.row}>
              <span className={styles.pill}>{user.name}</span>
              <button className={styles.btn} type="button" onClick={logout}>
                تسجيل خروج
              </button>
            </div>
          </div>

          <div className={styles.content}>
            <p className={styles.sectionLabel}>ضيف مهمة يديدة</p>
            <div className={styles.row}>
              <input
                ref={titleRef}
                className={styles.input}
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="شنو المهمة اليديدة؟"
                aria-label="عنوان المهمة"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTodo()
                }}
              />
            </div>

            <div className={styles.row} style={{ marginTop: 10 }}>
              <textarea
                className={styles.textarea}
                value={draftNotes}
                onChange={(e) => setDraftNotes(e.target.value)}
                placeholder="ملاحظات (اختياري)"
                aria-label="ملاحظات المهمة"
              />
            </div>

            <div className={styles.twoCol} style={{ marginTop: 10 }}>
              <input
                className={styles.input}
                type="date"
                value={draftDue}
                onChange={(e) => setDraftDue(e.target.value)}
                aria-label="تاريخ الاستحقاق"
              />
              <select
                className={styles.select}
                value={draftPriority}
                onChange={(e) => setDraftPriority(e.target.value as TodoPriority)}
                aria-label="الأولوية"
              >
                <option value="low">واطي</option>
                <option value="medium">وسط</option>
                <option value="high">عالية</option>
              </select>
            </div>

            <div className={styles.row} style={{ marginTop: 10 }}>
              <input
                className={styles.input}
                value={draftTags}
                onChange={(e) => setDraftTags(e.target.value)}
                placeholder="وسوم (اختياري) مثال: work, urgent"
                aria-label="وسوم المهمة"
              />
            </div>

            <div className={styles.footerRow}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={addTodo}>
                ضيف
              </button>
              <button className={styles.btn} type="button" onClick={talkWithAi}>
                اقترح لي بالذكاء الاصطناعي
              </button>
              <span className={styles.muted}>معلومة: افصل الوسوم بفاصلة</span>
            </div>

            <p className={styles.sectionLabel}>دور وفلتر</p>
            <div className={styles.row} style={{ marginTop: 16 }}>
              <input
                className={styles.input}
                value={filters.query}
                onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
                placeholder="دور على مهمة…"
                aria-label="بحث في المهام"
              />
            </div>

            <div className={styles.twoCol} style={{ marginTop: 10 }}>
              <select
                className={styles.select}
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as TodoFilters['status'] }))}
                aria-label="فلترة حسب الحالة"
              >
                <option value="all">الكل</option>
                <option value="open">للحين</option>
                <option value="done">خلصت</option>
              </select>
              <select
                className={styles.select}
                value={filters.priority}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, priority: e.target.value as TodoFilters['priority'] }))
                }
                aria-label="فلترة حسب الأولوية"
              >
                <option value="all">كل الأولويات</option>
                <option value="high">عالية</option>
                <option value="medium">وسط</option>
                <option value="low">واطي</option>
              </select>
            </div>

            <div className={styles.row} style={{ marginTop: 10 }}>
              <select
                className={styles.select}
                value={filters.tag}
                onChange={(e) => setFilters((f) => ({ ...f, tag: e.target.value }))}
                aria-label="فلترة حسب الوسم"
              >
                <option value="all">كل الوسوم</option>
                {tagsInUse.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.row} style={{ marginTop: 10 }}>
              <select
                className={styles.select}
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="updated_desc">آخر شي تعدّل</option>
                <option value="due_asc">الأقرب موعد</option>
                <option value="due_desc">الأبعد موعد</option>
              </select>
            </div>
            {error ? (
              <p className={styles.muted} style={{ color: '#fecaca', marginTop: 10 }}>
                {error}
              </p>
            ) : null}

            <div className={styles.list} aria-label="قائمة المهام">
              {loading ? (
                <div className={styles.muted} style={{ paddingTop: 10 }}>
                  قاعد يحمّل...
                </div>
              ) : todos.length === 0 ? (
                <div className={styles.muted} style={{ paddingTop: 10 }}>
                  ماكو مهام مطابقة للفلتر الحالي.
                </div>
              ) : (
                todos.map((t) => (
                  <div key={t.id} className={styles.item}>
                    <input
                      className={styles.checkbox}
                      type="checkbox"
                      checked={t.status === 'done'}
                      onChange={() => toggleDone(t.id)}
                      aria-label={t.status === 'done' ? 'رجّعها غير منجزة' : 'علّمها منجزة'}
                    />

                    <div>
                      <p
                        className={styles.itemTitle}
                        style={{
                          opacity: t.status === 'done' ? 0.7 : 1,
                          textDecoration: t.status === 'done' ? 'line-through' : 'none',
                        }}
                      >
                        {t.title}
                      </p>
                      <div className={styles.itemMeta}>
                        <span className={priorityBadgeClass(t.priority, styles)}>{formatPriority(t.priority)}</span>
                        {t.dueDate ? <span>الموعد: {t.dueDate}</span> : <span>بدون موعد</span>}
                      </div>
                      {t.notes ? (
                        <p className={styles.muted} style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>
                          {t.notes}
                        </p>
                      ) : null}
                      {t.tags.length > 0 ? (
                        <div className={styles.tags} aria-label="وسوم المهمة">
                          {t.tags.map((tag) => (
                            <span key={tag} className={styles.tag}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.row} style={{ justifyContent: 'end' }}>
                      <button className={`${styles.btn} ${styles.danger}`} type="button" onClick={() => removeTodo(t.id)}>
                        مسح
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div ref={suggestionsRef} className={styles.card}>
          <div className={styles.header}>
            <div>
              <h2 className={styles.title} style={{ fontSize: 16 }}>
                اقتراحات ذكية (AI)
              </h2>
              <p className={styles.subtitle}>اقتراحات من السيرفر على حسب مهامك الحالية</p>
            </div>
            <button className={styles.btn} type="button" onClick={refreshSuggestions} disabled={suggestionsLoading}>
              {suggestionsLoading ? 'جاري التحديث...' : 'حدّث الاقتراحات'}
            </button>
          </div>

          <div className={styles.content}>
            {suggestionsLoading ? (
              <p className={styles.muted}>جاري جلب اقتراحات الذكاء الاصطناعي...</p>
            ) : suggestions.length === 0 ? (
              <p className={styles.muted}>مافي اقتراحات</p>
            ) : (
              <div className={styles.list}>
                {suggestions.map((s) => (
                  <div key={s.id} className={styles.suggestion}>
                    <p className={styles.suggestionTitle}>{s.title}</p>
                    {s.detail ? <p className={styles.suggestionDetail}>{s.detail}</p> : null}
                    <div className={styles.row} style={{ justifyContent: 'space-between' }}>
                      <button className={`${styles.btn} ${styles.btnPrimary}`} type="button" onClick={() => applySuggestion(s)}>
                        طبّق
                      </button>
                      <span className={styles.muted}>
                        {s.action.kind === 'set_priority'
                          ? `أولوية → ${formatPriority(s.action.priority)}`
                          : s.action.kind === 'add_tag'
                            ? `وسم → ${normalizeTag(s.action.tag)}`
                            : s.action.kind === 'set_due_date'
                              ? `تاريخ → ${s.action.dueDate}`
                              : 'قسّم'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.mobileActionBar}>
        <button className={styles.btn} type="button" onClick={focusNewTaskInput}>
          مهمة يديدة
        </button>
        <button className={styles.btn} type="button" onClick={talkWithAi}>
          تكلم مع AI
        </button>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          type="button"
          onClick={() => {
            void addTodo()
          }}
          disabled={!draftTitle.trim() || loading}
        >
          إضافة سريعة
        </button>
      </div>
    </div>
  )
}

