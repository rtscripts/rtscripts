export interface CommandResponse {
  exit_code: 0 | 1
  message: string
  context?: any
}
