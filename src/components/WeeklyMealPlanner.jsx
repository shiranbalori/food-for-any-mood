import { getTheme } from '../utils/themes'
import { useLanguage } from '../i18n/useLanguage'
import { MEAL_TYPES, WEEK_DAYS, planHasAnyMeals } from '../utils/mealPlannerStorage'
import './WeeklyMealPlanner.css'

export default function WeeklyMealPlanner({ plan, onRemoveSlot, onClear, onSelectRecipe }) {
  const { t } = useLanguage()
  const hasMeals = planHasAnyMeals(plan)

  if (!hasMeals) {
    return (
      <section className="weekly-plan weekly-plan--empty">
        <h2 className="section-title">{t('weeklyPlanTitle')}</h2>
        <div className="weekly-plan__empty">
          <span>📅</span>
          <p>{t('weeklyPlanEmpty')}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="weekly-plan">
      <div className="weekly-plan__header">
        <h2 className="section-title">{t('weeklyPlanTitle')}</h2>
        <button type="button" className="btn btn--ghost weekly-plan__clear" onClick={onClear}>
          {t('clearWeeklyPlan')}
        </button>
      </div>

      <div className="weekly-plan__days">
        {WEEK_DAYS.map((day) => {
          const dayMeals = MEAL_TYPES.filter((meal) => plan?.[day]?.[meal]?.recipe)
          if (dayMeals.length === 0) return null

          return (
            <div key={day} className="weekly-plan__day">
              <h3 className="weekly-plan__day-title">{t(`weekDays.${day}`)}</h3>
              <div className="weekly-plan__meals">
                {dayMeals.map((meal) => {
                  const entry = plan[day][meal]
                  const recipe = entry.recipe
                  const theme = getTheme(recipe.category ?? 'parve')

                  return (
                    <article
                      key={`${day}-${meal}`}
                      className="weekly-plan__slot"
                      style={{
                        '--theme-accent': theme.accent,
                        '--theme-accent-light': theme.accentLight,
                      }}
                    >
                      <div className="weekly-plan__slot-head">
                        <span className="weekly-plan__meal-label">{t(`mealTypes.${meal}`)}</span>
                        <span className="weekly-plan__category">
                          {theme.emoji} {t(`categories.${recipe.category ?? 'parve'}`)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="weekly-plan__recipe-link"
                        onClick={() => onSelectRecipe(recipe)}
                      >
                        {recipe.name}
                      </button>
                      <div className="weekly-plan__meta">
                        {(recipe.cookTime ?? recipe.time) != null && (
                          <span>{t('cookTime', { count: recipe.cookTime ?? recipe.time })}</span>
                        )}
                        <span>{recipe.calories ?? '—'} kcal</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost weekly-plan__remove"
                        onClick={() => onRemoveSlot(day, meal)}
                      >
                        {t('removeFromWeeklyPlan')}
                      </button>
                    </article>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
