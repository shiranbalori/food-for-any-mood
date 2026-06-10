import { useState } from 'react'
import { useLanguage } from '../../i18n/useLanguage'
import { toggleChallengeSubmissionLike } from '../../services/dailyChallengeService'
import './DailyChallenge.css'

export default function ChallengeSubmissionCard({
  submission,
  userId,
  isAuthenticated,
  onAuthRequired,
  onUpdated,
}) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [liked, setLiked] = useState(submission.userLiked)
  const [likeCount, setLikeCount] = useState(submission.likeCount ?? 0)

  const handleLike = async () => {
    if (!isAuthenticated) {
      onAuthRequired?.()
      return
    }
    if (!userId || busy) return

    setBusy(true)
    try {
      const next = await toggleChallengeSubmissionLike(
        userId,
        submission.id,
        liked,
        submission.userId,
      )
      setLiked(next)
      setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)))
      onUpdated?.()
    } catch (error) {
      console.error('[ChallengeSubmissionCard] like failed:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="challenge-submission-card">
      {submission.photoUrl ? (
        <img
          src={submission.photoUrl}
          alt=""
          className="challenge-submission-card__photo"
          loading="lazy"
        />
      ) : (
        <div className="challenge-submission-card__photo challenge-submission-card__photo--empty">
          📸
        </div>
      )}
      <div className="challenge-submission-card__body">
        <h4 className="challenge-submission-card__title">{submission.dishName}</h4>
        <p className="challenge-submission-card__author">
          {t('communityAuthor', { name: submission.authorName })}
        </p>
        {submission.description ? (
          <p className="challenge-submission-card__desc">{submission.description}</p>
        ) : null}
        <div className="challenge-submission-card__actions">
          <button
            type="button"
            className={`challenge-submission-card__like ${liked ? 'challenge-submission-card__like--active' : ''}`}
            onClick={handleLike}
            disabled={busy}
          >
            {liked ? '❤️' : '🤍'} {likeCount}
          </button>
        </div>
      </div>
    </article>
  )
}
