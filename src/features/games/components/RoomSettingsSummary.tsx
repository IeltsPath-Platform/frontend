import { Clock3, Heart, Users } from 'lucide-react'
import type { RoomSettings } from '../types/game'
import type { GameType } from '../lib/gameRoutes'

function WordlySettingsSummary({ settings }: { settings: RoomSettings }) {
  return (
    <>
      <span>
        <Heart />
        {settings.initialLives} mạng / người
      </span>
      <span>
        <Users />
        {settings.playMode === 'ENDLESS'
          ? 'Vô hạn số từ'
          : `${settings.wordLimit} từ`}
      </span>
      <span>
        <Clock3 />
        {settings.timeEnabled
          ? `${settings.wordTimeLimitSeconds ?? 180} giây / từ`
          : 'Không giới hạn thời gian'}
      </span>
    </>
  )
}

function RocketSettingsSummary({ settings }: { settings: RoomSettings }) {
  return (
    <>
      <span>
        <Heart />
        {settings.initialLives} mạng / người
      </span>
      <span>
        <Users />
        {settings.questionCount ?? '—'} câu
      </span>
      <span>
        <Clock3 />
        {settings.secondsPerQuestion ?? 15} giây / câu
      </span>
    </>
  )
}

export function RoomSettingsSummary({
  gameType,
  settings,
}: {
  gameType: GameType
  settings: RoomSettings
}) {
  return gameType === 'ROCKET' ? (
    <RocketSettingsSummary settings={settings} />
  ) : (
    <WordlySettingsSummary settings={settings} />
  )
}
