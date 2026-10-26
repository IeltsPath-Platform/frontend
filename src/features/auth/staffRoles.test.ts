import { describe, expect, it } from 'vitest'
import { signInDestination } from './staffRoles'

describe('signInDestination', () => {
  it('prioritizes the administrator workspace for multiple roles', () => {
    expect(signInDestination(['CONTENT_AUTHOR', 'ADMIN'], '/community')).toBe('/admin')
  })

  it('sends content authors to their workspace', () => {
    expect(signInDestination(['CONTENT_AUTHOR'], '/overview')).toBe('/content-author')
  })

  it('sends examiners to their dashboard through the admin area, even when sign-in started on a learner page', () => {
    expect(signInDestination(['EXAMINER'])).toBe('/admin')
    expect(signInDestination(['EXAMINER'], '/community')).toBe('/admin')
    expect(signInDestination(['CONTENT_AUTHOR', 'EXAMINER'])).toBe('/content-author')
  })

  it('preserves learner destinations and the default overview', () => {
    expect(signInDestination(['CUSTOMER'], '/community')).toBe('/community')
    expect(signInDestination(['CUSTOMER'])).toBe('/overview')
    expect(signInDestination(undefined)).toBe('/overview')
  })
})
