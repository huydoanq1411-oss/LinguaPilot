export function lessonDestination(search) {
  const value = new URLSearchParams(search).get('next')
  if (!value || !value.startsWith('/jp/')) return '/jp/index.html'
  const url = new URL(value, 'https://linguapilot.invalid')
  if (url.origin !== 'https://linguapilot.invalid' || !/^\/jp\/[a-z0-9-]+\.html$/.test(url.pathname)) return '/jp/index.html'
  return url.pathname + url.search + url.hash
}
