const FALLBACK_MESSAGE = 'Không thể hoàn tất thao tác. Vui lòng thử lại.'

/** The server's Vietnamese message when it sent one, otherwise a generic line. */
export function errorMessage(error: unknown, fallback = FALLBACK_MESSAGE): string {
  return error instanceof Error && error.message ? error.message : fallback
}
