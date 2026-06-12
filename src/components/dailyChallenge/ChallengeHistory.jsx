import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n/useLanguage'
import { translateChallengeCategoryHint } from '../../i18n/challengeLabels'
import { fetchChallengeHistory } from '../../services/dailyChallengeService'
import ChallengeSubmissionCard from './ChallengeSubmissionCard'
import './DailyChallenge.css'

export default function ChallengeHistory() {
  const { t } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedDate, setExpandedDate] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchChallengeHistory(user?.id ?? null, 14)
        if (!cancelled) setEntries(data)
      } catch (error) {
        console.error('[ChallengeHistory] load failed:', error)
        if (!cancelled) setEntries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const toggleDate = (dateKey) => {
    setExpandedDate((current) => (current === dateKey ? null : dateKey))
  }

  return (
    <section className="challenge-history" aria-labelledby="challenge-history-title">
      <h3 id="challenge-history-title" className="challenge-section-title">
        {t('challengeHistoryTitle')}
      </h3>

      {loading && <p className="challenge-muted">{t('challengeLoading')}</p>}

      {!loading && entries.length === 0 && (
        <p className="challenge-muted">{t('challengeHistoryEmpty')}</p>
      )}

      {!loading && entries.length > 0 && (
        <ul className="challenge-history__list">
          {entries.map((entry) => {
            const isExpanded = expandedDate === entry.challengeDate
            const categoryLabel = translateChallengeCategoryHint(t, entry.challenge.categoryHint)

            return (
              <li key={entry.challengeDate} className="challenge-history__item">
                <button
                  type="button"
                  className="challenge-history__summary"
                  onClick={() => toggleDate(entry.challengeDate)}
                  aria-expanded={isExpanded}
                >
                  <span className="challenge-history__date">{entry.challengeDate}</span>
                  <span className="challenge-history__meta">
                    {t('challengeHistorySubmissions', { count: entry.submissionCount })}
                  </span>
                  {entry.winner ? (
                    <span className="challenge-history__winner">
                      {t('challengeHistoryWinner', { name: entry.winner.dishName })}
                    </span>
                  ) : (
                    <span className="challenge-history__winner challenge-muted">
                      {t('challengeHistoryNoWinner')}
                    </span>
                  )}
                </button>

                {isExpanded ? (
                  <div className="challenge-history__details">
                    <p className="challenge-history__category">
                      {t('challengeOptionalCategory')}: {categoryLabel}
                    </p>
                    <ul className="challenge-home__ingredients">
                      {entry.challenge.ingredients.map((ingredient) => (
                        <li key={ingredient}>{ingredient}</li>
                      ))}
                    </ul>

                    {isAuthenticated && entry.userSubmission ? (
                      <div className="challenge-history__subsection">
                        <h4>{t('challengeHistoryYourSubmission')}</h4>
                        <ChallengeSubmissionCard
                          submission={entry.userSubmission}
                          userId={user?.id}
                          isAuthenticated={isAuthenticated}
                        />
                      </div>
                    ) : isAuthenticated ? (
                      <p className="challenge-muted">{t('challengeHistoryNoYourSubmission')}</p>
                    ) : null}

                    {entry.communitySubmissions.length > 0 ? (
                      <div className="challenge-history__subsection">
                        <h4>{t('challengeHistoryCommunity')}</h4>
                        <div className="challenge-submissions__grid">
                          {entry.communitySubmissions.map((submission) => (
                            <ChallengeSubmissionCard
                              key={submission.id}
                              submission={submission}
                              userId={user?.id}
                              isAuthenticated={isAuthenticated}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
