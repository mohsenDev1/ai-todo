import type { AiSuggestion } from './types'

type RawTask = {
  id: string
  title: string
  notes: string
  dueDate: Date | null
  priority: string
  status: string
  tags: string
}

function stableId(prefix: string, parts: string[]) {
  return `${prefix}:${parts.join(':')}`
}

function normalizeTag(raw: string) {
  return raw.trim().toLowerCase().replace(/\s+/g, '-')
}

export function createTaskSuggestions(tasks: RawTask[]): AiSuggestion[] {
  const open = tasks.filter((t) => t.status === 'open')
  const suggestions: AiSuggestion[] = []

  for (const task of open) {
    const title = task.title.toLowerCase()
    const tags = task.tags
      .split(',')
      .map((t) => normalizeTag(t))
      .filter(Boolean)

    if ((title.includes('urgent') || title.includes('عاجل') || title.includes('ضروري')) && task.priority !== 'high') {
      suggestions.push({
        id: stableId('priority', [task.id, 'high']),
        title: `ارفَع أولوية "${task.title}"`,
        detail: 'العنوان يوحي بأنها مهمة مستعجلة.',
        action: { kind: 'set_priority', taskId: task.id, priority: 'high' },
      })
    }

    if (!task.dueDate && (title.includes('tomorrow') || title.includes('بكرة') || title.includes('غدا'))) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 1)
      const iso = dueDate.toISOString().slice(0, 10)
      suggestions.push({
        id: stableId('due', [task.id, iso]),
        title: `حدد موعد لـ "${task.title}"`,
        detail: 'المهمة مرتبطة بزمن قريب، الأفضل تحديد موعد.',
        action: { kind: 'set_due_date', taskId: task.id, dueDate: iso },
      })
    }

    if (tags.length === 0) {
      const candidate =
        title.includes('عميل') || title.includes('project') || title.includes('meeting')
          ? 'work'
          : title.includes('study') || title.includes('اختبار')
            ? 'study'
            : title.includes('فاتورة') || title.includes('دفع')
              ? 'finance'
              : undefined
      if (candidate) {
        suggestions.push({
          id: stableId('tag', [task.id, candidate]),
          title: `أضف وسم "${candidate}"`,
          detail: 'الوسوم تحسن الفلترة والتنظيم.',
          action: { kind: 'add_tag', taskId: task.id, tag: candidate },
        })
      }
    }
  }

  return suggestions.slice(0, 10)
}

