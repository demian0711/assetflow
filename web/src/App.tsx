import { useEffect, useState } from 'react'

const messages = {
  checking: 'Checking API connection…',
  connected: 'API connected',
  unavailable: 'API unavailable',
}

function App() {
  const [status, setStatus] = useState<keyof typeof messages>('checking')

  useEffect(() => {
    const controller = new AbortController()
    const { signal } = controller

    async function checkHealth() {
      try {
        const response = await fetch('/health/live', { signal, cache: 'no-store' })
        const health = response.ok ? await response.json() : null

        if (!signal.aborted) {
          setStatus(health?.status === 'healthy' ? 'connected' : 'unavailable')
        }
      } catch {
        if (!signal.aborted) {
          setStatus('unavailable')
        }
      }
    }

    void checkHealth()

    return () => controller.abort()
  }, [])

  return (
    <main>
      <h1>AssetFlow</h1>
      <p role="status">{messages[status]}</p>
    </main>
  )
}

export default App
