import { computed, ref } from 'vue'
import { copyText } from './clipboard'
import { preferences } from './preferences'

export type LogLevel = 'info' | 'warn' | 'error'

export interface LogEntry {
  id: number
  time: Date
  level: LogLevel
  message: string
}

let nextId = 0

export const logs = ref<LogEntry[]>([])

export function log(message: string, level: LogLevel = 'info') {
  logs.value.push({ id: nextId++, time: new Date(), level, message })
  if (logs.value.length > preferences.logLines) logs.value.splice(0, logs.value.length - preferences.logLines)
}

export function clearLogs() {
  logs.value = []
}

// the log panel is a single shell-owned instance (App.vue), so its filter and context row live here
// where the registry's log.* commands can read and act on them from outside the component
export const logFilter = ref<'all' | 'warn' | 'error'>('all')
export const logContext = ref<LogEntry | null>(null)
export const shownLogs = computed(() => logs.value.filter((entry) => logFilter.value === 'all' || entry.level === 'error' || (logFilter.value === 'warn' && entry.level === 'warn')))

export const logTimeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const formatLogEntry = (entry: LogEntry) => `${logTimeFormat.format(entry.time)} ${entry.level} ${entry.message}`

export function copyLogLine() {
  if (logContext.value) return copyText(formatLogEntry(logContext.value))
}

export function copyAllLogs() {
  return copyText(shownLogs.value.map(formatLogEntry).join('\n'))
}
