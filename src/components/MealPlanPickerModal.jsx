import { useEffect, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { MEAL_TYPES, WEEK_DAYS, addRecipeToMealPlan } from '../utils/mealPlannerStorage'
import './MealPlanPickerModal.css'

export default function MealPlanPickerModal({
  open,
  onClose,
  recipe,
  onPlanUpdated,
}) {
  const { t, dir, isRtl } = useLanguage()
  const textDir = isRtl ? 'rtl' : dir
  const [selectedDay, setSelectedDay] = useState(null)
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [notice, setNotice] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedDay(null)
      setSelectedMeal(null)
      setNotice(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const handleSave = () => {
    if (!selectedDay || !selectedMeal || !recipe) return
    const plan = addRecipeToMealPlan(selectedDay, selectedMeal, recipe)
    onPlanUpdated?.(plan)
    setNotice(true)
    window.setTimeout(() => {
      setNotice(false)
      onClose()
    }, 900)
  }

  if (!open) return null

  return (
    <div className="meal-plan-modal" onClick={onClose} role="presentation">
      <div
        className="meal-plan-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-plan-modal-title"
        dir={textDir}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="meal-plan-modal__header">
          <h2 id="meal-plan-modal-title">{t('addToWeeklyPlan')}</h2>
          <p className="meal-plan-modal__recipe-name">{recipe?.name}</p>
          <button
            type="button"
            className="meal-plan-modal__close"
            onClick={onClose}
            aria-label={t('closeMealPlanPicker')}
          >
            ×
          </button>
        </div>

        <div className="meal-plan-modal__section">
          <h3>{t('choosePlanDay')}</h3>
          <div className="meal-plan-modal__options">
            {WEEK_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`meal-plan-modal__option ${
                  selectedDay === day ? 'meal-plan-modal__option--active' : ''
                }`}
                onClick={() => setSelectedDay(day)}
              >
                {t(`weekDays.${day}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="meal-plan-modal__section">
          <h3>{t('choosePlanMeal')}</h3>
          <div className="meal-plan-modal__options meal-plan-modal__options--meals">
            {MEAL_TYPES.map((meal) => (
              <button
                key={meal}
                type="button"
                className={`meal-plan-modal__option ${
                  selectedMeal === meal ? 'meal-plan-modal__option--active' : ''
                }`}
                onClick={() => setSelectedMeal(meal)}
              >
                {t(`mealTypes.${meal}`)}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn--primary meal-plan-modal__save"
          onClick={handleSave}
          disabled={!selectedDay || !selectedMeal}
        >
          {t('saveToWeeklyPlan')}
        </button>

        {notice && (
          <p className="meal-plan-modal__notice" role="status">
            {t('mealPlanSaved')}
          </p>
        )}
      </div>
    </div>
  )
}
