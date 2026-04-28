export type TaskPriority = 'low' | 'medium' | 'high'
export type TaskStatus = 'open' | 'done'

export type SuggestionAction =
  | { kind: 'set_priority'; taskId: string; priority: TaskPriority }
  | { kind: 'add_tag'; taskId: string; tag: string }
  | { kind: 'set_due_date'; taskId: string; dueDate: string }

export type AiSuggestion = {
  id: string
  title: string
  detail?: string
  action: SuggestionAction
}

