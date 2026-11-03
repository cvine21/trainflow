/** Bottom tab bar is only for signed-in (or offline/local) root tabs — never on the auth wall. */
export function canShowTabBar({
  pathname,
  tabPaths,
  configured,
  loading,
  signedIn,
}: {
  pathname: string
  tabPaths: Set<string>
  configured: boolean
  loading: boolean
  signedIn: boolean
}): boolean {
  return tabPaths.has(pathname) && !loading && (!configured || signedIn)
}
