export type TodoPriority = 'low' | 'medium' | 'high'
export type TodoStatus = 'open' | 'done'

export type TodoItem = {
  id: string
  title: string
  notes: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  priority: TodoPriority
  status: TodoStatus
  tags: string[]
}

export type TodoFilters = {
  query: string
  status: 'all' | TodoStatus
  tag: string | 'all'
  priority: 'all' | TodoPriority
}

export type SuggestionAction =
  | { kind: 'add_tag'; taskId: string; tag: string }
  | { kind: 'set_priority'; taskId: string; priority: TodoPriority }
  | { kind: 'set_due_date'; taskId: string; dueDate: string }
  | { kind: 'split_into_subtasks'; taskId: string; titles: string[] }

export type AiSuggestion = {
  id: string
  title: string
  detail?: string
  action: SuggestionAction
}

