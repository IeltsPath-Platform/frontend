export interface StatisticsResourceState<T> {
  key: string
  version: number
  data: T | null
  error: string | null
  loading: boolean
}

type StatisticsResourceAction<T> =
  | { type: 'scope'; key: string }
  | { type: 'reload' }
  | { type: 'success'; key: string; version: number; data: T }
  | { type: 'failure'; key: string; version: number; error: string }

export function statisticsResourceReducer<T>(state: StatisticsResourceState<T>, action: StatisticsResourceAction<T>): StatisticsResourceState<T> {
  if (action.type === 'scope') {
    return { key: action.key, version: state.version + 1, data: null, error: null, loading: true }
  }
  if (action.type === 'reload') {
    return { ...state, version: state.version + 1, error: null, loading: true }
  }
  // A request may settle after a refresh or after switching away and back to the same scope.
  if (action.key !== state.key || action.version !== state.version) return state
  if (action.type === 'success') return { ...state, data: action.data, error: null, loading: false }
  return { ...state, error: action.error, loading: false }
}
