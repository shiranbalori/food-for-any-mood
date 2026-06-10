import { useMemo, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { generateThemedMeal, upgradeThemedMeal } from '../services/themedMealService'
import { sanitizeThemedMealUpgrade } from '../utils/themedMealFallback'
import './ThemedMeals.css'

export const THEMED_MEAL_THEME_KEYS = [
  'friday_dinner',
  'family_gathering',
  'birthday',
  'kids_party',
  'movie_night',
  'picnic',
  'bbq',
  'romantic_dinner',
  'holiday_meal',
  'rosh_hashanah',
  'passover',
  'shavuot',
  'hanukkah',
  'sukkot',
  'summer_party',
  'brunch',
  'other',
]

const CATEGORY_OPTIONS = ['dairy', 'meat', 'parve']

function MealSection({ title, children }) {
  if (!children) return null
  return (
    <div className="themed-meals__section">
      <h3>{title}</h3>
      {children}
    </div>
  )
}

function ListBlock({ items }) {
  if (!items?.length) return null
  return (
    <ul>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  )
}

export default function ThemedMeals() {
  const { t, language } = useLanguage()
  const [theme, setTheme] = useState('friday_dinner')
  const [customTheme, setCustomTheme] = useState('')
  const [category, setCategory] = useState('parve')
  const [glutenFree, setGlutenFree] = useState(false)
  const [meal, setMeal] = useState(null)
  const [upgrade, setUpgrade] = useState(null)
  const [loading, setLoading] = useState(false)
  const [upgradeLoading, setUpgradeLoading] = useState(false)
  const [error, setError] = useState(null)
  const [upgradeError, setUpgradeError] = useState(null)

  const displayUpgrade = useMemo(() => {
    if (!upgrade || !meal) return null
    return sanitizeThemedMealUpgrade(upgrade, meal, category, glutenFree, language)
  }, [upgrade, meal, category, glutenFree, language])

  const handleGenerate = async () => {
    if (theme === 'other' && !customTheme.trim()) {
      setError(t('themedMealsCustomThemeRequired'))
      return
    }

    setLoading(true)
    setError(null)
    setUpgrade(null)
    setUpgradeError(null)

    try {
      const { meal: generated } = await generateThemedMeal({
        theme,
        customTheme: customTheme.trim(),
        category,
        isGlutenFree: glutenFree,
        language,
      })
      setMeal(generated)
    } catch (err) {
      console.error('[ThemedMeals] generate failed:', err)
      setError(t('themedMealsGenerateError'))
      setMeal(null)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgrade = async () => {
    if (!meal || upgradeLoading) return

    setUpgradeLoading(true)
    setUpgradeError(null)

    try {
      const { upgrade: upgraded } = await upgradeThemedMeal({
        theme,
        customTheme: customTheme.trim(),
        category,
        isGlutenFree: glutenFree,
        language,
        meal,
      })
      setUpgrade(upgraded)
    } catch (err) {
      console.error('[ThemedMeals] upgrade failed:', err)
      setUpgradeError(t('themedMealsUpgradeError'))
    } finally {
      setUpgradeLoading(false)
    }
  }

  return (
    <section className="themed-meals" aria-labelledby="themed-meals-title">
      <p className="themed-meals__intro">{t('themedMealsIntro')}</p>

      <div className="themed-meals__controls">
        <label className="themed-meals__field">
          <span>{t('themedMealsThemeLabel')}</span>
          <select
            value={theme}
            onChange={(event) => {
              setTheme(event.target.value)
              setMeal(null)
              setUpgrade(null)
              setError(null)
              setUpgradeError(null)
            }}
          >
            {THEMED_MEAL_THEME_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`themedMealsThemes.${key}`)}
              </option>
            ))}
          </select>
        </label>

        {theme === 'other' && (
          <label className="themed-meals__field">
            <span>{t('themedMealsCustomThemeLabel')}</span>
            <input
              type="text"
              value={customTheme}
              onChange={(event) => setCustomTheme(event.target.value)}
              placeholder={t('themedMealsCustomThemePlaceholder')}
            />
          </label>
        )}

        <fieldset className="themed-meals__category">
          <legend>{t('themedMealsCategoryLabel')}</legend>
          <div className="themed-meals__category-options">
            {CATEGORY_OPTIONS.map((option) => (
              <label key={option} className="themed-meals__radio">
                <input
                  type="radio"
                  name="themed-meal-category"
                  value={option}
                  checked={category === option}
                  onChange={() => setCategory(option)}
                />
                <span>{t(`categories.${option}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="themed-meals__checkbox">
          <input
            type="checkbox"
            checked={glutenFree}
            onChange={(event) => setGlutenFree(event.target.checked)}
          />
          <span>{t('glutenFreeLabel')}</span>
        </label>

        <button
          type="button"
          className="btn btn--primary themed-meals__generate-btn"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading ? t('themedMealsGenerating') : t('themedMealsGenerateBtn')}
        </button>
      </div>

      {error && (
        <p className="themed-meals__error" role="alert">
          {error}
        </p>
      )}

      {meal && (
        <article className="themed-meals__result">
          <header className="themed-meals__result-head">
            <h3>{meal.mealTitle}</h3>
            <p>{meal.description}</p>
          </header>

          <MealSection title={t('themedMealsStarter')}>
            <p>{meal.starter}</p>
          </MealSection>
          <MealSection title={t('themedMealsMain')}>
            <p>{meal.main}</p>
          </MealSection>
          <MealSection title={t('themedMealsSides')}>
            <ListBlock items={meal.sides} />
          </MealSection>
          <MealSection title={t('themedMealsDessert')}>
            <p>{meal.dessert}</p>
          </MealSection>
          <MealSection title={t('themedMealsDrinks')}>
            <ListBlock items={meal.drinks} />
          </MealSection>
          <MealSection title={t('themedMealsServingIdeas')}>
            <ListBlock items={meal.servingIdeas} />
          </MealSection>
          <MealSection title={t('themedMealsHostingTips')}>
            <ListBlock items={meal.hostingTips} />
          </MealSection>

          <button
            type="button"
            className="btn btn--secondary themed-meals__upgrade-btn"
            onClick={handleUpgrade}
            disabled={upgradeLoading}
          >
            {upgradeLoading ? t('themedMealsUpgrading') : t('themedMealsUpgradeBtn')}
          </button>
        </article>
      )}

      {upgradeError && (
        <p className="themed-meals__error" role="alert">
          {upgradeError}
        </p>
      )}

      {displayUpgrade && (
        <article className="themed-meals__upgrade">
          <h3>{displayUpgrade.upgradedMealTitle}</h3>
          <MealSection title={t('themedMealsUpgradedMenu')}>
            <ListBlock items={displayUpgrade.upgradedMenu} />
          </MealSection>
          <MealSection title={t('themedMealsDishUpgrades')}>
            <ListBlock items={displayUpgrade.dishUpgrades} />
          </MealSection>
          <MealSection title={t('themedMealsServingIdeas')}>
            <ListBlock items={displayUpgrade.servingIdeas} />
          </MealSection>
          <MealSection title={t('themedMealsAtmosphere')}>
            <ListBlock items={displayUpgrade.atmosphereIdeas} />
          </MealSection>
          <MealSection title={t('themedMealsSpecialAdditions')}>
            <ListBlock items={displayUpgrade.specialAdditions} />
          </MealSection>
          <MealSection title={t('themedMealsImpressiveTips')}>
            <ListBlock items={displayUpgrade.impressiveTips} />
          </MealSection>
        </article>
      )}
    </section>
  )
}
