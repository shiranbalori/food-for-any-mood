import { useEffect, useState } from 'react'
import PlaylistCard from './PlaylistCard'
import SpiceLevel from './SpiceLevel'
import ShoppingListModal from './ShoppingListModal'
import MealPlanPickerModal from './MealPlanPickerModal'
import NutritionCoach from './NutritionCoach'
import RecipeUpgradeCard from './RecipeUpgradeCard'
import { useLanguage } from '../i18n/useLanguage'
import { resolveRecipeNutritionScore } from '../utils/nutritionScore'
import { sanitizeIngredientList } from '../utils/ingredientFormatting'
import './RecipeCard.css'

function HealthBar({ recipe }) {
  const { t, language } = useLanguage()
  const { score, classification, explanation } = resolveRecipeNutritionScore(recipe, language)
  const safeScore = Math.min(100, Math.max(0, score ?? 0))
  const color = classification.color

  return (
    <div className="health-bar animate-in stagger-4">
      <div className="health-bar__header">
        <span>{t('healthScore')}</span>
        <strong style={{ color }}>{safeScore}/100</strong>
      </div>
      <p className="health-bar__classification" style={{ color }}>
        {explanation}
      </p>
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
  themeCategory,
  isSaved,
  isFavorite,
  saveError,
  onSave,
  onAddFavorite,
  onRegenerate,
  onRegenerateSteps,
  stepsRegenerating = false,
  stepsRegenerateError = null,
  stepsGenerationKey = 0,
  onUpgradeRecipe,
  upgradeLoading = false,
  upgradeError = null,
  upgradedRecipe = null,
  upgradeRecipeContext = null,
  recipeIdeas,
  ideasLoading,
  onLoadMoreIdeas,
  onMealPlanUpdated,
}) {
  const { t, dir, isRtl } = useLanguage()
  const [shoppingOpen, setShoppingOpen] = useState(false)
  const [mealPlanOpen, setMealPlanOpen] = useState(false)
  const preferenceBased = Boolean(recipe.generatedFromPreferences)
  const matchPercent = Math.min(100, Math.max(0, recipe.matchPercent ?? 0))
  const displayCategory =
    themeCategory === 'any' && recipe.resolvedCategory
      ? recipe.resolvedCategory
      : themeCategory ?? recipe.category
  const textDir = isRtl ? 'rtl' : dir
  const displayIngredients = sanitizeIngredientList(recipe.ingredients ?? [])

  useEffect(() => {
    console.log('RENDERED_RECIPE', recipe)
  }, [recipe])

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
        <div className={`recipe-card__match${preferenceBased ? ' recipe-card__match--preferences' : ''}`}>
          {preferenceBased ? (
            <p className="recipe-card__preferences-label">{t('matchFromPreferences')}</p>
          ) : (
            <>
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
            </>
          )}
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
            {themeCategory === 'any' && recipe.resolvedCategory && (
              <span className="recipe-card__classified-badge">
                {t(`categories.${recipe.resolvedCategory}`)}
              </span>
            )}
          </div>
          <h2>{recipe.name}</h2>
          <p className="recipe-card__chef-intro">{recipe.description}</p>
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
        category={displayCategory}
        recipeName={recipe.name}
        cookTime={recipe.cookTime ?? recipe.time}
        style={recipe.style}
        spiceLevel={recipe.spiceLevel}
      />

      <HealthBar recipe={recipe} />

      <NutritionCoach recipe={recipe} />

      <div className="recipe-card__section animate-in stagger-4">
        <h3>{t('ingredients')}</h3>
        <ul dir={textDir}>
          {displayIngredients.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      {!preferenceBased && recipe.optionalUpgrades?.length > 0 && (
        <div className="recipe-card__section recipe-card__upgrades animate-in stagger-4">
          <h3>{t('optionalUpgrades')}</h3>
          <ul dir={textDir} className="recipe-card__upgrades-list">
            {recipe.optionalUpgrades.map((upgrade, i) => (
              <li key={i}>
                <strong>{upgrade.ingredient}</strong>
                <span className="recipe-card__optional-badge">{t('optionalBadge')}</span>
                <p>{upgrade.reason}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recipe.categoryNote && (
        <p className="recipe-card__category-note animate-in stagger-4" role="note">
          {recipe.categoryNote}
        </p>
      )}

      <div className="recipe-card__section animate-in stagger-5">
        <div className="recipe-card__steps-header">
          <h3>{t('cookingSteps')}</h3>
          {onRegenerateSteps && (
            <button
              type="button"
              className="btn btn--secondary recipe-card__regenerate-steps-btn"
              onClick={onRegenerateSteps}
              disabled={stepsRegenerating}
            >
              {stepsRegenerating ? t('regenerateStepsLoading') : t('regenerateSteps')}
            </button>
          )}
        </div>
        {stepsRegenerateError && (
          <p className="recipe-card__steps-error" role="alert">
            {stepsRegenerateError}
          </p>
        )}
        <ol dir={textDir} key={`steps-${stepsGenerationKey}`}>
          {(recipe.steps ?? []).map((step, i) => (
            <li key={`${stepsGenerationKey}-${i}`}>
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
        {onUpgradeRecipe && (
          <>
            <button
              type="button"
              className="btn btn--secondary recipe-card__upgrade-btn"
              onClick={onUpgradeRecipe}
              disabled={upgradeLoading}
            >
              {upgradeLoading ? t('upgradeRecipeLoading') : t('upgradeRecipeBtn')}
            </button>
            {upgradeError && (
              <p className="recipe-card__upgrade-error" role="alert">
                {upgradeError}
              </p>
            )}
          </>
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

      {upgradedRecipe && (
        <RecipeUpgradeCard upgrade={upgradedRecipe} recipeContext={upgradeRecipeContext} />
      )}

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
        ingredients={displayIngredients}
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
