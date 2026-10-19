import { gameApi } from '../api/gameApi'
import type { GameMatch, GameRoom } from '../types/game'

export async function startSoloRoom(
  room: GameRoom,
  signal?: AbortSignal,
): Promise<GameMatch> {
  signal?.throwIfAborted()
  if (room.playerMode !== 'SOLO') {
    throw new Error('Chỉ tự động bắt đầu cho chế độ chơi đơn.')
  }
  if (room.status === 'IN_MATCH' && room.activeMatchId) {
    return gameApi.match(room.activeMatchId)
  }
  if (room.status !== 'WAITING') {
    throw new Error('Phiên chơi không còn khả dụng. Vui lòng tạo phiên mới.')
  }

  try {
    await gameApi.ready(room.id, true)
    signal?.throwIfAborted()
    return await gameApi.start(room.id)
  } catch (cause) {
    if (signal?.aborted) throw cause
    // A start response can be lost after commit, or another tab may have started it.
    try {
      const latest = await gameApi.room(room.id)
      if (
        latest.playerMode === 'SOLO' &&
        latest.status === 'IN_MATCH' &&
        latest.activeMatchId
      ) {
        return await gameApi.match(latest.activeMatchId)
      }
    } catch {
      // Preserve the original failure so retry can reuse this room.
    }
    throw cause
  }
}
