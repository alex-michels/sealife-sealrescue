// SR-11: refresh an existing offline installation before importing its modules.
// First-time visitors install nothing until Play; previously cached players can update here.
if ('serviceWorker' in navigator) {
  try {
    const scope = new URL('./', import.meta.url)
    const registration = await navigator.serviceWorker.getRegistration(scope.href)
    if (registration?.active?.scriptURL === new URL('sw.js', scope).href) {
      await registration.update()
      const worker = registration.installing || registration.waiting
      if (worker && worker.state !== 'activated') {
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 12000)
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated' || worker.state === 'redundant') {
              clearTimeout(timer)
              resolve()
            }
          })
        })
      }
    }
  } catch {
    // Offline startup uses the complete previously installed asset set.
  }
}
try {
  await import('./game.js')
} catch {
  const status = document.getElementById('boot-status')
  status.textContent = 'Could not load / Не удалось загрузить. '
  const retry = document.createElement('button')
  retry.textContent = 'Retry / Повторить'
  retry.addEventListener('click', () => location.reload())
  status.append(retry)
}
