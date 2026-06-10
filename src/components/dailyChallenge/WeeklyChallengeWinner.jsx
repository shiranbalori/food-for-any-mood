import { useEffect, useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage'
import { fetchWeeklyChallengeWinner } from '../../services/dailyChallengeService'
import './DailyChallenge.css'

export default function WeeklyChallengeWinner() {
  const { t } = useLanguage()
  const [winner, setWinner] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchWeeklyChallengeWinner()
        if (!cancelled) setWinner(data)
      } catch (error) {
        console.error('[WeeklyChallengeWinner] load failed:', error)
        if (!cancelled) setWinner(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="challenge-muted">{t('challengeLoading')}</p>
  }

  if (!winner?.submission) {
    return (
      <section className="challenge-weekly-winner" aria-labelledby="challenge-weekly-winner-title">
        <h3 id="challenge-weekly-winner-title" className="challenge-section-title">
          {t('challengeWeeklyWinnerTitle')}
        </h3>
        <p className="challenge-muted">{t('challengeWeeklyWinnerEmpty')}</p>
      </section>
    )
  }

  const { submission } = winner

  return (
    <section className="challenge-weekly-winner" aria-labelledby="challenge-weekly-winner-title">
      <h3 id="challenge-weekly-winner-title" className="challenge-section-title">
        {t('challengeWeeklyWinnerTitle')}
      </h3>
      <article className="challenge-weekly-winner__card">
        {submission.photoUrl ? (
          <img
            src={submission.photoUrl}
            alt=""
            className="challenge-weekly-winner__photo"
            loading="lazy"
          />
        ) : (
          <div className="challenge-weekly-winner__photo challenge-weekly-winner__photo--empty">
            🏆
          </div>
        )}
        <div className="challenge-weekly-winner__body">
          <h4>{submission.dishName}</h4>
          <p>{t('communityAuthor', { name: submission.authorName || t('defaultDisplayName') })}</p>
          <p>{t('challengeWeeklyWinnerLikes', { count: submission.likeCount ?? 0 })}</p>
        </div>
      </article>
    </section>
  )
}
