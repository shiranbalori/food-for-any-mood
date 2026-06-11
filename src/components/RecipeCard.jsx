import { useEffect, useState } from 'react'

import PlaylistCard from './PlaylistCard'

import ShoppingListModal from './ShoppingListModal'

import MealPlanPickerModal from './MealPlanPickerModal'

import NutritionCoach from './NutritionCoach'

import RecipeUpgradeCard from './RecipeUpgradeCard'

import { useLanguage } from '../i18n/useLanguage'

import { resolveRecipeNutritionScore } from '../utils/nutritionScore'

import { sanitizeIngredientList } from '../utils/ingredientFormatting'

import './RecipeCard.css'



function useMobileLayout() {

  const [isMobile, setIsMobile] = useState(() => {

    if (typeof window === 'undefined') return false

    return window.matchMedia('(max-width: 768px)').matches

  })



  useEffect(() => {

    const mediaQuery = window.matchMedia('(max-width: 768px)')

    const update = () => setIsMobile(mediaQuery.matches)

    update()

    mediaQuery.addEventListener('change', update)

    return () => mediaQuery.removeEventListener('change', update)

  }, [])



  return isMobile

}



function HealthBar({ recipe, expanded, onExpandedChange, showToggle = true }) {

  const { language } = useLanguage()

  const { score, classification, explanation } = resolveRecipeNutritionScore(recipe, language)

  const safeScore = Math.min(100, Math.max(0, score ?? 0))

  const color = classification.color



  return (

    <div className="health-bar health-bar--compact animate-in">

      <div className="health-bar__summary">

        <span className="health-bar__score-line">

          ציון בריאות: <strong style={{ color }}>{safeScore}/100</strong>

        </span>

        {showToggle && (

          <button

            type="button"

            className="health-bar__toggle health-bar__toggle--in-bar btn btn--secondary mobile-details-btn"

            onClick={() => onExpandedChange(!expanded)}

            aria-expanded={expanded}

          >

            {expanded ? 'הסתר פרטים' : 'פרטים נוספים'}

          </button>

        )}

      </div>

      {expanded && (

        <div className="health-bar__details">

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

      )}

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

  onBackToEdit,

}) {

  const { t, dir, isRtl } = useLanguage()

  const [shoppingOpen, setShoppingOpen] = useState(false)

  const [mealPlanOpen, setMealPlanOpen] = useState(false)

  const [healthExpanded, setHealthExpanded] = useState(false)

  const isMobileLayout = useMobileLayout()

  const preferenceBased = Boolean(recipe.generatedFromPreferences)

  const matchPercent = Math.min(100, Math.max(0, recipe.matchPercent ?? 0))

  const displayCategory =

    themeCategory === 'any' && recipe.resolvedCategory

      ? recipe.resolvedCategory

      : themeCategory ?? recipe.category

  const textDir = isRtl ? 'rtl' : dir

  const displayIngredients = sanitizeIngredientList(recipe.ingredients ?? [])

  const nutrition = recipe.nutrition ?? {}

  const calories = recipe.calories ?? nutrition.calories

  const protein = recipe.protein ?? nutrition.protein

  const carbs = recipe.carbs ?? nutrition.carbs

  const fat = recipe.fat ?? nutrition.fat

  const servings = recipe.servings ?? nutrition.servings

  const cookTime = recipe.cookTime ?? recipe.time



  useEffect(() => {

    console.log('RENDERED_RECIPE', recipe)

  }, [recipe])



  return (

    <article

      className={`recipe-card recipe-card--compact animate-in${healthExpanded ? ' recipe-card--health-expanded' : ''}`}

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



      <header className="recipe-card__header animate-in">

        {onBackToEdit && (
          <button
            type="button"
            className="btn btn--secondary recipe-card__back-to-edit"
            onClick={onBackToEdit}
          >
            {t('backToEdit')}
          </button>
        )}

        <h2>{recipe.name}</h2>

        <div className="recipe-card__info recipe-card__info--header">

          {displayCategory && (

            <span className="recipe-card__tag recipe-card__tag--category">

              {t(`categories.${displayCategory}`)}

            </span>

          )}

          {recipe.glutenFree && (

            <span className="recipe-card__tag recipe-card__tag--gf">{t('glutenFreeBadge')}</span>

          )}

          {cookTime && <span>{t('cookTime', { count: cookTime })}</span>}

          {servings && <span>{t('servings', { count: servings })}</span>}

          {preferenceBased ? (

            <span className="recipe-card__tag recipe-card__tag--preferences">

              {t('matchFromPreferences')}

            </span>

          ) : (

            matchPercent > 0 && (

              <span className="recipe-card__tag recipe-card__tag--match">

                {matchPercent}% {t('match')}

              </span>

            )

          )}

        </div>

      </header>



      <div className="recipe-card__macros animate-in stagger-1">

        <MacroItem label={t('calories')} value={calories ?? '—'} unit="kcal" />

        <MacroItem label={t('protein')} value={protein ?? '—'} unit="g" />

        <MacroItem label={t('carbs')} value={carbs ?? '—'} unit="g" />

        <MacroItem label={t('fat')} value={fat ?? '—'} unit="g" />

      </div>



      <div className="recipe-card__section animate-in stagger-2">

        <h3>{t('ingredients')}</h3>

        <ul dir={textDir}>

          {displayIngredients.map((item, i) => (

            <li key={i}>{item}</li>

          ))}

        </ul>

      </div>



      {!preferenceBased && recipe.optionalUpgrades?.length > 0 && (

        <div className="recipe-card__section recipe-card__upgrades animate-in stagger-2">

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

        <p className="recipe-card__category-note animate-in stagger-2" role="note">

          {recipe.categoryNote}

        </p>

      )}



      <div className="recipe-card__section animate-in stagger-3">

        <div className="recipe-card__steps-header">

          <h3>{t('cookingSteps')}</h3>

          {onRegenerateSteps && (

            <button

              type="button"

              className="btn btn--secondary recipe-card__regenerate-steps-btn recipe-card__regenerate-steps-btn--header mobile-regenerate-steps-btn"

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



      <div className="recipe-card__action-area animate-in stagger-4">

        {saveError && (

          <p className="recipe-card__save-error" role="alert">

            {t('saveError')}

          </p>

        )}

        {upgradeError && (

          <p className="recipe-card__upgrade-error" role="alert">

            {upgradeError}

          </p>

        )}

        <div className={`recipe-card__action-grid${isMobileLayout ? ' recipe-card__action-grid--mobile' : ''}`}>

          {isMobileLayout ? (

            <>

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

              {onUpgradeRecipe && (

                <button

                  type="button"

                  className="btn btn--secondary recipe-card__upgrade-btn"

                  onClick={onUpgradeRecipe}

                  disabled={upgradeLoading}

                >

                  {upgradeLoading ? t('upgradeRecipeLoading') : t('upgradeRecipeBtn')}

                </button>

              )}

              <button

                type="button"

                className={`btn btn--secondary recipe-card__save-btn ${isSaved ? 'btn--saved' : ''}`}

                onClick={onSave}

                disabled={isSaved}

              >

                {isSaved ? t('saved') : t('saveRecipe')}

              </button>

              <button

                type="button"

                className={`btn btn--secondary recipe-card__favorite-btn ${isFavorite ? 'btn--saved' : ''}`}

                onClick={onAddFavorite}

                disabled={isFavorite}

              >

                {isFavorite ? t('savedToFavorites') : t('saveToFavorites')}

              </button>

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

            </>

          ) : (

            <>

              <div className="recipe-card__shopping">

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



              <div className="recipe-card__actions">

                {onUpgradeRecipe && (

                  <button

                    type="button"

                    className="btn btn--secondary recipe-card__upgrade-btn"

                    onClick={onUpgradeRecipe}

                    disabled={upgradeLoading}

                  >

                    {upgradeLoading ? t('upgradeRecipeLoading') : t('upgradeRecipeBtn')}

                  </button>

                )}

                <button

                  type="button"

                  className={`btn btn--secondary recipe-card__save-btn ${isSaved ? 'btn--saved' : ''}`}

                  onClick={onSave}

                  disabled={isSaved}

                >

                  {isSaved ? t('saved') : t('saveRecipe')}

                </button>

                <button

                  type="button"

                  className={`btn btn--secondary recipe-card__favorite-btn ${isFavorite ? 'btn--saved' : ''}`}

                  onClick={onAddFavorite}

                  disabled={isFavorite}

                >

                  {isFavorite ? t('savedToFavorites') : t('saveToFavorites')}

                </button>

                {onRegenerateSteps && (

                  <button

                    type="button"

                    className="btn btn--secondary recipe-card__regenerate-steps-btn recipe-card__regenerate-steps-btn--grid"

                    onClick={onRegenerateSteps}

                    disabled={stepsRegenerating}

                  >

                    {stepsRegenerating ? t('regenerateStepsLoading') : t('regenerateSteps')}

                  </button>

                )}

                <button

                  type="button"

                  className="btn btn--primary recipe-card__action-primary"

                  onClick={onRegenerate}

                >

                  {t('generateAnother')}

                </button>

              </div>

            </>

          )}

        </div>



        {isMobileLayout && (

          <button

            type="button"

            className="btn btn--primary recipe-card__action-primary"

            onClick={onRegenerate}

          >

            {t('generateAnother')}

          </button>

        )}

      </div>



      {upgradedRecipe && (

        <RecipeUpgradeCard upgrade={upgradedRecipe} recipeContext={upgradeRecipeContext} />

      )}



      <PlaylistCard

        compact

        playlist={recipe.playlist}

        musicPlatform={musicPlatform ?? recipe.musicPlatform}

        mood={recipe.mood}

        category={displayCategory}

        recipeName={recipe.name}

        cookTime={cookTime}

        style={recipe.style}

        spiceLevel={recipe.spiceLevel}

      />



      <HealthBar

        recipe={recipe}

        expanded={healthExpanded}

        onExpandedChange={setHealthExpanded}

      />



      <NutritionCoach recipe={recipe} tipsOnly />



      <div className="recipe-card__ideas animate-in">

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


