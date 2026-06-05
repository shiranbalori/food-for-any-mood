import { useEffect, useState } from 'react'
import { getMillisUntilNextChallenge } from '../utils/dailyChallenge/generateDailyChallenge'
import { formatChallengeCountdown } from '../utils/dailyChallenge/countdown'

export function useChallengeCountdown() {
  const [remainingMs, setRemainingMs] = useState(getMillisUntilNextChallenge())
  const [countdown, setCountdown] = useState(formatChallengeCountdown(remainingMs))

  useEffect(() => {
    const tick = () => {
      const ms = getMillisUntilNextChallenge()
      setRemainingMs(ms)
      setCountdown(formatChallengeCountdown(ms))
    }

    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [])

  return { remainingMs, countdown }
}
