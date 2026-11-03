import { describe, expect, it } from 'vitest'
import { canShowTabBar } from '@/lib/appNav'

const tabs = new Set(['/', '/workouts', '/exercises'])

describe('canShowTabBar', () => {
  it('hides the tab bar on the authentication wall', () => {
    // Arrange
    const args = { pathname: '/', tabPaths: tabs, configured: true, loading: false, signedIn: false }

    // Act
    const visible = canShowTabBar(args)

    // Assert
    expect(visible).toBe(false)
  })

  it('hides the tab bar while the session is loading', () => {
    expect(canShowTabBar({ pathname: '/', tabPaths: tabs, configured: true, loading: true, signedIn: false })).toBe(
      false,
    )
  })

  it('shows the tab bar after sign-in on a root tab', () => {
    expect(canShowTabBar({ pathname: '/', tabPaths: tabs, configured: true, loading: false, signedIn: true })).toBe(
      true,
    )
  })

  it('hides the tab bar on nested routes even when signed in', () => {
    expect(
      canShowTabBar({ pathname: '/clients/new', tabPaths: tabs, configured: true, loading: false, signedIn: true }),
    ).toBe(false)
  })

  it('shows the tab bar when Supabase is not configured', () => {
    expect(
      canShowTabBar({ pathname: '/workouts', tabPaths: tabs, configured: false, loading: false, signedIn: false }),
    ).toBe(true)
  })
})
