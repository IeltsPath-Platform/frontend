import { describe, expect, it } from 'vitest'
import { bandText, intakeFull, intakePercent, intakeText, profileInput } from './dashboardLabels'

describe('intake', () => {
  it('says how many were taken against the limit, or only the count when the limit is unknown', () => {
    expect(intakeText({ receivedToday: 7, dailyLimit: 10 })).toBe('Đã nhận 7/10 bài hôm nay')
    expect(intakeText({ receivedToday: 7, dailyLimit: null })).toBe('Đã nhận 7 bài hôm nay')
    expect(intakeText({ receivedToday: 0, dailyLimit: undefined })).toBe('Đã nhận 0 bài hôm nay')
  })

  it('measures the share of the limit used, never above 100', () => {
    expect(intakePercent({ receivedToday: 7, dailyLimit: 10 })).toBe(70)
    expect(intakePercent({ receivedToday: 12, dailyLimit: 10 })).toBe(100)
    expect(intakePercent({ receivedToday: 3, dailyLimit: null })).toBeNull()
  })

  it('is full only when a known limit is reached', () => {
    expect(intakeFull({ receivedToday: 9, dailyLimit: 10 })).toBe(false)
    expect(intakeFull({ receivedToday: 10, dailyLimit: 10 })).toBe(true)
    expect(intakeFull({ receivedToday: 50, dailyLimit: null })).toBe(false)
  })
})

describe('profile', () => {
  it('shows the band with one decimal, or says it is missing', () => {
    expect(bandText(8)).toBe('8.0')
    expect(bandText(7.5)).toBe('7.5')
    expect(bandText(null)).toBe('Chưa cập nhật')
  })

  it('turns a profile into what the server takes, with blanks as null and a patch on top', () => {
    const profile = { ieltsBand: null, acceptingSubmissions: true, certificates: [{ name: 'CELTA' }, { name: 'IELTS', issuer: 'BC', year: 2023, score: '8.0' }] }
    expect(profileInput(profile)).toEqual({
      ieltsBand: null,
      certificates: [{ name: 'CELTA', issuer: null, year: null, score: null }, { name: 'IELTS', issuer: 'BC', year: 2023, score: '8.0' }],
      acceptingSubmissions: true,
    })
    expect(profileInput(profile, { acceptingSubmissions: false }).acceptingSubmissions).toBe(false)
  })
})
