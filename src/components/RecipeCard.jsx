import { useState } from 'react'
import PlaylistCard from './PlaylistCard'
import SpiceLevel from './SpiceLevel'
import ShoppingListModal from './ShoppingListModal'
import MealPlanPickerModal from './MealPlanPickerModal'
import NutritionCoach from './NutritionCoach'
import { useLanguage } from '../i18n/useLanguage'
import './RecipeCard.css'

function HealthBar({ score }) {
  const { t } = useLanguage()
  const safeScore = Math.min(100, Math.max(0, score ?? 0))
  const color =
    safeScore >= 80 ? '#059669' : safeScore >= 60 ? '#d97706' : '#dc2626'

  return (
    <div className="health-bar animate-in stagger-4">
      <div className="health-bar__header">
        <span>{t('healthScore')}</span>
        <strong style={{ color }}>{safeScore}/100</strong>
      </div>
      <div className="health-bar__track">
        <div
          className="health-bar__fill"
          style={{ width: `${safeScore}%`, background: color }}
        />
      </div>
    </div>
  )
}

function MacroItem({ label, value, unit }) {
  return (
    <div className="macro-item">
      <span className="macro-item__value">
        {value}
        <small>{unit}</small>
      </span>
      <span className="macro-item__label">{label}</span>
    </div>
  )
}

function RecipeTags({ tags }) {
  const { t } = useLanguage()
  if (!tags?.length) return null

  const resolveTagLabel = (tag) => {
    const translated = t(`tags.${tag}`)
    return translated === `tags.${tag}` ? tag : translated
  }

  return (
    <div className="recipe-tags">
      {tags.map((tag) => (
        <span key={tag} className="recipe-tags__chip">
          {resolveTagLabel(tag)}
        </span>
      ))}
    </div>
  )
}

export default function RecipeCard({
  recipe,
  musicPlatform,
  theme,
  isSaved,
  isFavorite,
  saveError,
  onSave,
  onAddFavorite,
  onRegenerate,
  recipeIdeas,
  ideasLoading,
  onLoadMoreIdeas,
  onMealPlanUpdated,
}) {
  const { t, dir, isRtl } = useLanguage()
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [mealPlanOpen, setMealPlanOpen] = useState(false)
  const matchPercent = Math.min(100, Math.max(0, recipe.matchPercent ?? 0))
  const textDir = isRtl ? 'rtl' : dir

  return (
    <article
      className="recipe-card animate-in"
      dir={textDir}
      style={{
        '--theme-accent': theme.accent,
        '--theme-accent-light': theme.accentLight,
        '--theme-gradient': theme.gradient,
        '--theme-shadow': theme.shadow,
        '--theme-glow': theme.glow,
      }}
    >
      <div className="recipe-card__glow" aria-hidden="true" />

      <div className="recipe-card__header animate-in">
        <div className="recipe-card__match">
          <svg viewBox="0 0 36 36" className="match-ring">
            <path
              className="match-ring__bg"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="match-ring__fill"
              strokeDasharray={`${matchPercent}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" className="match-ring__text">
              {matchPercent}%
            </text>
          </svg>
          <span>{t('match')}</span>
        </div>
        <div className="recipe-card__title-block">
          <div className="recipe-card__badges">
            {recipe.style && (
              <span className="recipe-card__style">
                {t(`styles.${recipe.style}`)}
              </span>
            )}
            {recipe.glutenFree && (
              <span className="recipe-card__gf-badge">{t('glutenFreeBadge')}</span>
            )}
          </div>
          <h2>{recipe.name}</h2>
          <p>{recipe.description}</p>
          <RecipeTags tags={recipe.tags} />
        </div>
      </div>

      <div className="recipe-card__info animate-in stagger-1">
        {recipe.cookTime && (
          <span>{t('cookTime', { count: recipe.cookTime })}</span>
        )}
        {recipe.servings && (
          <span>{t('servings', { count: recipe.servings })}</span>
        )}
      </div>

      <div className="recipe-card__macros animate-in stagger-2">
        <MacroItem label={t('calories')} value={recipe.calories ?? '—'} unit="kcal" />
        <MacroItem label={t('protein')} value={recipe.protein ?? '—'} unit="g" />
        <MacroItem label={t('carbs')} value={recipe.carbs ?? '—'} unit="g" />
        <MacroItem label={t('fat')} value={recipe.fat ?? '—'} unit="g" />
      </div>

      <div className="recipe-card__meta animate-in stagger-3">
        <div className="recipe-card__meta-item">
          <span className="recipe-card__meta-label">{t('spiceLevel')}</span>
          <SpiceLevel level={recipe.spiceLevel} max={3} />
        </div>
      </div>

      <PlaylistCard
        playlist={recipe.playlist}
        musicPlatform={musicPlatform ?? recipe.musicPlatform}
        mood={recipe.mood}
        category={recipe.category}
        recipeName={recipe.name}
        cookTime={recipe.cookTime ?? recipe.time}
        style={recipe.style}
        spiceLevel={recipe.spiceLevel}
      />

      <HealthBar score={recipe.healthScore} />

      <NutritionCoach recipe={recipe} />

      <div className="recipe-card__section animate-in stagger-4">
        <h3>{t('ingredients')}</h3>
        <ul dir={textDir}>
          {(recipe.ingredients ?? []).map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="recipe-card__section animate-in stagger-5">
        <h3>{t('cookingSteps')}</h3>
        <ol dir={textDir}>
          {(recipe.steps ?? []).map((step, i) => (
            <li key={i}>
              <span className="step-number">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="recipe-card__shopping animate-in stagger-5">
        <button
          type="button"
          className="btn btn--secondary recipe-card__shopping-btn"
          onClick={() => setShoppingOpen(true)}
        >
          {t('createShoppingList')}
        </button>
        <button
          type="button"
          className="btn btn--secondary recipe-card__shopping-btn"
          onClick={() => setMealPlanOpen(true)}
        >
          {t('addToWeeklyPlan')}
        </button>
      </div>

      <div className="recipe-card__actions animate-in stagger-5">
        {saveError && (
          <p className="recipe-card__save-error" role="alert">
            {t('saveError')}
          </p>
        )}
        <button
          type="button"
          className={`btn btn--secondary ${isSaved ? 'btn--saved' : ''}`}
          onClick={onSave}
          disabled={isSaved}
        >
          {isSaved ? t('saved') : t('saveRecipe')}
        </button>
        <button
          type="button"
          className={`btn btn--secondary ${isFavorite ? 'btn--saved' : ''}`}
          onClick={onAddFavorite}
          disabled={isFavorite}
        >
          {isFavorite ? t('savedToFavorites') : t('saveToFavorites')}
        </button>
        <button type="button" className="btn btn--primary" onClick={onRegenerate}>
          {t('generateAnother')}
        </button>
      </div>

      <div className="recipe-card__ideas animate-in stagger-5">
        {recipeIdeas == null && (
          <button
            type="button"
            className="btn btn--secondary recipe-card__ideas-btn"
            onClick={onLoadMoreIdeas}
            disabled={ideasLoading}
          >
            {ideasLoading ? t('moreIdeasLoading') : t('showMoreIdeas')}
          </button>
        )}

        {recipeIdeas?.length > 0 && (
          <div className="recipe-card__ideas-list">
            <h3>{t('moreIdeasTitle')}</h3>
            {recipeIdeas.map((idea, index) => (
              <article key={`${idea.title}-${index}`} className="recipe-idea-card">
                <h4>{idea.title}</h4>
                <p className="recipe-idea-card__desc">{idea.description}</p>
                <p className="recipe-idea-card__meta">
                  {t('cookTime', { count: idea.cookingTime })}
                </p>
                <p className="recipe-idea-card__match">
                  <strong>{t('ideaMatchReason')}:</strong> {idea.matchReason}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <ShoppingListModal
        open={shoppingOpen}
        onClose={() => setShoppingOpen(false)}
        recipeId={recipe.id}
        recipeName={recipe.name}
        ingredients={recipe.ingredients ?? []}
      />

      <MealPlanPickerModal
        open={mealPlanOpen}
        onClose={() => setMealPlanOpen(false)}
        recipe={recipe}
        onPlanUpdated={onMealPlanUpdated}
      />
    </article>
  )
}
