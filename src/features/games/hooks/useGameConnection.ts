import { useEffect, useEffectEvent, useState } from 'react'
import { API_BASE_URL } from '@/lib/env'
import { HttpError } from '@/lib/httpClient'
import { gameApi } from '../api/gameApi'
import type { GameEvent } from '../types/game'

/** Tickets are single-use. A reconnect always requests a fresh ticket. */
export function useGameConnection(
  roomId: string | null,
  onEvent: (event: GameEvent) => void,
  matchId?: string,
) {
  const [connected, setConnected] = useState(false)
  const receive = useEffectEvent(onEvent)
  useEffect(() => {
    if (!roomId) return
    let disposed = false
    let socket: WebSocket | undefined
    let retry: ReturnType<typeof setTimeout> | undefined
    let handshake: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let terminal = false
    const connect = async () => {
      try {
        const ticket = await gameApi.ticket(roomId)
        if (disposed) return
        const url = new URL('/ws/games', API_BASE_URL)
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
        socket = new WebSocket(url, ticket.subprotocols)
        handshake = setTimeout(() => socket?.close(), 10000)
        socket.onmessage = ({ data }) => {
          if (disposed) return
          let event: GameEvent
          try {
            event = JSON.parse(String(data)) as GameEvent
          } catch {
            return
          }
          if (!event || typeof event.type !== 'string') return
          if (event.type === 'CONNECTED') {
            clearTimeout(handshake)
            failures = 0
            setConnected(true)
            if (matchId)
              socket?.send(JSON.stringify({ type: 'RECONNECT', matchId }))
          }
          if (event.type === 'ROOM_CLOSED' || event.type === 'PLAYER_KICKED')
            terminal = true
          receive(event)
        }
        socket.onclose = () => {
          clearTimeout(handshake)
          if (disposed) return
          setConnected(false)
          if (!terminal)
            retry = setTimeout(
              () => {
                void connect()
              },
              Math.min(1000 * 2 ** failures++, 10000),
            )
        }
        socket.onerror = () => socket?.close()
      } catch (reason) {
        if (disposed) return
        setConnected(false)
        if (
          reason instanceof HttpError &&
          [401, 403, 404].includes(reason.status)
        )
          return
        retry = setTimeout(
          () => {
            void connect()
          },
          Math.min(1000 * 2 ** failures++, 10000),
        )
      }
    }
    void connect()
    return () => {
      disposed = true
      clearTimeout(retry)
      clearTimeout(handshake)
      socket?.close()
    }
  }, [roomId, matchId])
  return connected && Boolean(roomId)
}
