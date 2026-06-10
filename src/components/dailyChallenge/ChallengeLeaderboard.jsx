import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage'
import { fetchChallengeLeaderboard } from '../../services/dailyChallengeService'
import { getUserLevel } from '../../utils/dailyChallenge/levels'
import './DailyChallenge.css'

export default function ChallengeLeaderboard() {
  const { t } = useLanguage()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchChallengeLeaderboard(10)
        if (!cancelled) setEntries(data)
      } catch (error) {
        console.error('[ChallengeLeaderboard] load failed:', error)
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="challenge-leaderboard" aria-labelledby="challenge-leaderboard-title">
      <h3 id="challenge-leaderboard-title" className="challenge-section-title">
        {t('challengeLeaderboardTitle')}
      </h3>

      {loading && <p className="challenge-muted">{t('challengeLoading')}</p>}

      {!loading && entries.length === 0 && (
        <p className="challenge-muted">{t('challengeLeaderboardEmpty')}</p>
      )}

      {!loading && entries.length > 0 && (
        <ol className="challenge-leaderboard__list">
          {entries.map((entry) => {
            const level = getUserLevel(entry.totalPoints)
            return (
              <li key={entry.userId} className="challenge-leaderboard__item">
                <span className="challenge-leaderboard__rank">{entry.rank}</span>
                <div className="challenge-leaderboard__info">
                  <strong>{entry.displayName || t('defaultDisplayName')}</strong>
                  <span>
                    {level.icon} {t(level.labelKey)}
                  </span>
                  <span className="challenge-leaderboard__streak">
                    {t('challengeCurrentStreak', { count: entry.currentStreak ?? 0 })}
                  </span>
                </div>
                <span className="challenge-leaderboard__points">
                  {t('challengePointsCount', { count: entry.totalPoints })}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
