import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../i18n/useLanguage'
import {
  fetchUserQuizAnswerToday,
  getTodayQuiz,
  submitDailyQuizAnswer,
} from '../../services/dailyQuizService'
import AuthModal from '../AuthModal'
import './DailyQuiz.css'

export default function DailyQuizModal({ open, onClose, onAnswered }) {
  const { t, language } = useLanguage()
  const { user, isAuthenticated } = useAuth()
  const quiz = useMemo(() => getTodayQuiz(language), [language])
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)

  const loadPreviousAnswer = useCallback(async () => {
    if (!user?.id) {
      setResult(null)
      setSelectedIndex(null)
      return
    }
    const previous = await fetchUserQuizAnswerToday(user.id)
    if (previous) {
      setSelectedIndex(previous.selectedIndex)
      setResult(previous)
    } else {
      setSelectedIndex(null)
      setResult(null)
    }
  }, [user?.id])

  useEffect(() => {
    if (!open) return undefined
    loadPreviousAnswer()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose, loadPreviousAnswer])

  if (!open) return null

  const answered = result !== null

  const handleSelect = async (index) => {
    if (answered || loading) return

    if (!isAuthenticated) {
      setAuthOpen(true)
      return
    }

    setLoading(true)
    setSelectedIndex(index)
    try {
      const answer = await submitDailyQuizAnswer(user.id, index, quiz.correctIndex)
      setResult(answer)
      onAnswered?.()
    } catch (error) {
      if (error?.message === 'ALREADY_ANSWERED') {
        await loadPreviousAnswer()
      } else {
        const correct = index === quiz.correctIndex
        setResult({ selectedIndex: index, correct, pointsAwarded: 0 })
      }
    } finally {
      setLoading(false)
    }
  }

  const isCorrect = result?.correct === true

  return (
    <>
      <div className="quiz-overlay" role="presentation">
        <button
          type="button"
          className="quiz-overlay__backdrop"
          onClick={onClose}
          aria-label={t('close')}
        />
        <div className="quiz-overlay__panel" role="dialog" aria-modal="true">
          <header className="quiz-overlay__header">
            <h2 className="quiz-overlay__title">{t('quizDailyTitle')}</h2>
            <button
              type="button"
              className="quiz-overlay__close"
              onClick={onClose}
              aria-label={t('close')}
            >
              ×
            </button>
          </header>

          <div className="quiz-overlay__body">
            <p className="quiz-overlay__question">{quiz.question}</p>

            <ol className="quiz-options">
              {quiz.options.map((option, index) => {
                const isSelected = selectedIndex === index
                const isRight = answered && index === quiz.correctIndex
                const isWrong = answered && isSelected && index !== quiz.correctIndex

                return (
                  <li key={option}>
                    <button
                      type="button"
                      className={`quiz-option ${
                        isRight ? 'quiz-option--correct' : ''
                      } ${isWrong ? 'quiz-option--wrong' : ''} ${
                        isSelected ? 'quiz-option--selected' : ''
                      }`}
                      onClick={() => handleSelect(index)}
                      disabled={answered || loading}
                    >
                      <span className="quiz-option__index">{index + 1}.</span>
                      <span>{option}</span>
                    </button>
                  </li>
                )
              })}
            </ol>

            {answered ? (
              <div
                className={`quiz-feedback ${
                  isCorrect ? 'quiz-feedback--correct' : 'quiz-feedback--incorrect'
                }`}
                role="status"
              >
                <p className="quiz-feedback__message">
                  {isCorrect ? t('quizFeedbackCorrect') : t('quizFeedbackIncorrect')}
                </p>
                <p className="quiz-feedback__explanation">{quiz.explanation}</p>
              </div>
            ) : (
              <p className="quiz-overlay__hint">{t('quizSelectHint')}</p>
            )}

            {!isAuthenticated && !answered ? (
              <p className="quiz-overlay__login-hint">{t('quizLoginForPoints')}</p>
            ) : null}
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode="login" />
    </>
  )
}
