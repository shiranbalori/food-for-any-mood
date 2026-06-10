import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n/useLanguage'
import {
  fetchAllChallengeSubmissions,
  fetchChallengeSubmissions,
  fetchUserGamification,
  getTodayChallenge,
  userSubmittedToday,
} from '../../services/dailyChallengeService'
import AuthModal from '../AuthModal'
import AchievementsPanel from './AchievementsPanel'
import BestChallengePhotos from './BestChallengePhotos'
import ChallengeCountdown from './ChallengeCountdown'
import ChallengeHistory from './ChallengeHistory'
import ChallengeLeaderboard from './ChallengeLeaderboard'
import ChallengeStatus from './ChallengeStatus'
import ChallengeSubmissionCard from './ChallengeSubmissionCard'
import ChallengeSubmitModal from './ChallengeSubmitModal'
import UserChallengeStats from './UserChallengeStats'
import WeeklyChallengeWinner from './WeeklyChallengeWinner'
import './DailyChallenge.css'

export default function DailyChallengePage() {
  const { t } = useLanguage()
  const { user, isAuthenticated, displayName, loading: authLoading } = useAuth()
  const challenge = useMemo(() => getTodayChallenge(), [])
  const [stats, setStats] = useState(null)
  const [todaySubmissions, setTodaySubmissions] = useState([])
  const [historySubmissions, setHistorySubmissions] = useState([])
  const [submittedToday, setSubmittedToday] = useState(false)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const refresh = useCallback(async () => {
    if (authLoading) return
    const uid = user?.id
    if (uid) {
      const [gamification, hasSubmitted, today, history] = await Promise.all([
        fetchUserGamification(uid),
        userSubmittedToday(uid),
        fetchChallengeSubmissions(challenge.challengeDate, uid),
        fetchAllChallengeSubmissions(uid, 30),
      ])
      setStats(gamification)
      setSubmittedToday(hasSubmitted)
      setTodaySubmissions(today)
      setHistorySubmissions(history)
    } else {
      const today = await fetchChallengeSubmissions(challenge.challengeDate, null)
      const history = await fetchAllChallengeSubmissions(null, 30)
      setStats(null)
      setSubmittedToday(false)
      setTodaySubmissions(today)
      setHistorySubmissions(history)
    }
  }, [authLoading, user?.id, challenge.challengeDate])

  useEffect(() => {
    refresh()
  }, [refresh])

  const categoryLabel =
    challenge.categoryHint === 'none'
      ? t('challengeCategoryNone')
      : t(`challengeCategory.${challenge.categoryHint}`)

  const handleParticipate = () => {
    if (!isAuthenticated) {
      setAuthOpen(true)
      return
    }
    if (submittedToday) return
    setSubmitOpen(true)
  }

  return (
    <section className="challenge-page">
      <header className="challenge-page__header">
        <h2 className="challenge-page__title">{t('challengeDailyTitle')}</h2>
      </header>

      <ChallengeCountdown />

      {isAuthenticated ? (
        <>
          <ChallengeStatus completed={submittedToday} />
          <UserChallengeStats stats={stats} />
        </>
      ) : null}

      <div className="challenge-page__today">
        {categoryLabel ? (
          <p className="challenge-home__category">
            {t('challengeOptionalCategory')}: {categoryLabel}
          </p>
        ) : null}
        <ul className="challenge-home__ingredients">
          {challenge.ingredients.map((ingredient) => (
            <li key={ingredient}>{ingredient}</li>
          ))}
        </ul>
        <p className="challenge-home__rule">{t(challenge.ruleKey)}</p>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handleParticipate}
          disabled={submittedToday}
        >
          {submittedToday ? t('challengeAlreadyParticipated') : t('challengeParticipated')}
        </button>
      </div>

      <WeeklyChallengeWinner />

      <section className="challenge-page__section">
        <h3 className="challenge-section-title">{t('challengeTopSubmissions')}</h3>
        <div className="challenge-submissions__grid">
          {todaySubmissions.map((submission) => (
            <ChallengeSubmissionCard
              key={submission.id}
              submission={submission}
              userId={user?.id}
              isAuthenticated={isAuthenticated}
              onAuthRequired={() => setAuthOpen(true)}
              onUpdated={refresh}
            />
          ))}
        </div>
        {todaySubmissions.length === 0 && (
          <p className="challenge-muted">{t('challengeNoSubmissionsToday')}</p>
        )}
      </section>

      <ChallengeLeaderboard />

      <BestChallengePhotos />

      <ChallengeHistory />

      <section className="challenge-page__section">
        <h3 className="challenge-section-title">{t('challengeCommunityTitle')}</h3>
        <div className="challenge-submissions__grid">
          {historySubmissions.map((submission) => (
            <ChallengeSubmissionCard
              key={submission.id}
              submission={submission}
              userId={user?.id}
              isAuthenticated={isAuthenticated}
              onAuthRequired={() => setAuthOpen(true)}
              onUpdated={refresh}
            />
          ))}
        </div>
      </section>

      {isAuthenticated ? <AchievementsPanel stats={stats} /> : null}

      <ChallengeSubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        userId={user?.id}
        authorName={displayName}
        onSubmitted={refresh}
      />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
    </section>
  )
}
