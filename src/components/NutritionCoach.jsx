import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { fetchNutritionAnalysis } from '../services/nutritionCoachService'
import { getNutritionScoreClassification } from '../utils/nutritionScore'
import './NutritionCoach.css'

function LevelBadge({ level, t }) {
  const label = t(`nutritionLevel.${level}`)
  return (
    <span className={`nutrition-coach__level nutrition-coach__level--${level}`}>
      {label}
    </span>
  )
}

function InsightRow({ active, label }) {
  return (
    <li className={`nutrition-coach__insight ${active ? 'nutrition-coach__insight--active' : ''}`}>
      <span aria-hidden="true">{active ? '✅' : '○'}</span>
      <span>{label}</span>
    </li>
  )
}

export default function NutritionCoach({ recipe }) {
  const { t, dir, isRtl, language } = useLanguage()
  const textDir = isRtl ? 'rtl' : dir
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const result = await fetchNutritionAnalysis(recipe, language)
      if (!cancelled) {
        setAnalysis(result)
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [recipe?.id, recipe?.name, language])

  const score = analysis?.nutritionScore ?? 0
  const classification = getNutritionScoreClassification(score)
  const scoreColor = classification.color
  const scoreExplanation = analysis?.nutritionScoreExplanation ?? ''

  return (
    <section className="nutrition-coach animate-in stagger-4" dir={textDir}>
      <h3 className="nutrition-coach__title">{t('nutritionAnalysisTitle')}</h3>

      {loading && (
        <p className="nutrition-coach__loading" role="status">
          {t('nutritionLoading')}
        </p>
      )}

      {!loading && analysis && (
        <>
          <div className="nutrition-coach__score">
            <div className="nutrition-coach__score-header">
              <span>{t('nutritionScoreLabel')}</span>
              <strong style={{ color: scoreColor }}>{score}/100</strong>
            </div>
            <p className="nutrition-coach__classification" style={{ color: scoreColor }}>
              {scoreExplanation}
            </p>
            <div className="nutrition-coach__score-track">
              <div
                className="nutrition-coach__score-fill"
                style={{ width: `${score}%`, background: scoreColor }}
              />
            </div>
          </div>

          <div className="nutrition-coach__macros">
            <div className="nutrition-coach__macro-row">
              <span>{t('macroProtein')}</span>
              <LevelBadge level={analysis.macroLevels.protein} t={t} />
            </div>
            <div className="nutrition-coach__macro-row">
              <span>{t('macroCarbs')}</span>
              <LevelBadge level={analysis.macroLevels.carbs} t={t} />
            </div>
            <div className="nutrition-coach__macro-row">
              <span>{t('macroFat')}</span>
              <LevelBadge level={analysis.macroLevels.fat} t={t} />
            </div>
            <div className="nutrition-coach__macro-row">
              <span>{t('macroFiber')}</span>
              <LevelBadge level={analysis.macroLevels.fiber} t={t} />
            </div>
          </div>

          <ul className="nutrition-coach__insights">
            <InsightRow active={analysis.insights.suitableForDiet} label={t('insightDiet')} />
            <InsightRow active={analysis.insights.suitableForKids} label={t('insightKids')} />
            <InsightRow active={analysis.insights.suitableForDinner} label={t('insightDinner')} />
            <InsightRow
              active={analysis.insights.suitableForPostWorkout}
              label={t('insightPostWorkout')}
            />
          </ul>

          {analysis.tips?.length > 0 && (
            <div className="nutrition-coach__tips">
              <h4>{t('nutritionTipsTitle')}</h4>
              <ul>
                {analysis.tips.map((tip, index) => (
                  <li key={`${index}-${tip.slice(0, 12)}`}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
