import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n/useLanguage'
import { fetchUserGamification } from '../../services/dailyChallengeService'
import AchievementsPanel from './AchievementsPanel'
import ChallengeLeaderboard from './ChallengeLeaderboard'
import UserChallengeStats from './UserChallengeStats'
import './DailyChallenge.css'

export default function GamificationPage() {
  const { t } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setStats(null)
      return undefined
    }
    let cancelled = false
    fetchUserGamification(user.id)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((error) => {
        console.error('[GamificationPage] gamification load failed:', error)
        if (!cancelled) setStats(null)
      })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, user?.id])

  if (!isAuthenticated) {
    return <p className="challenge-muted">{t('challengeLoginHint')}</p>
  }

  return (
    <div className="challenge-page">
      <UserChallengeStats stats={stats} />
      <AchievementsPanel stats={stats} />
      <div className="challenge-page__section">
        <ChallengeLeaderboard />
      </div>
    </div>
  )
}
