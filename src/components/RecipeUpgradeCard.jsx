import { useMemo } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { sanitizeRecipeUpgrade } from '../utils/upgradeContentQuality'
import './RecipeUpgradeCard.css'

function ListSection({ title, items }) {
  if (!items?.length) return null
  return (
    <div className="recipe-upgrade__section">
      <h4>{title}</h4>
      <ul>
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

export default function RecipeUpgradeCard({ upgrade, recipeContext = {} }) {
  const { t } = useLanguage()
  const displayUpgrade = useMemo(
    () => (upgrade ? sanitizeRecipeUpgrade(upgrade, recipeContext) : null),
    [upgrade, recipeContext],
  )
  if (!displayUpgrade) return null

  return (
    <article className="recipe-upgrade animate-in" aria-labelledby="recipe-upgrade-title">
      <header className="recipe-upgrade__header">
        <p className="recipe-upgrade__badge">{t('recipeUpgradeBadge')}</p>
        <h3 id="recipe-upgrade-title">{displayUpgrade.upgradedTitle}</h3>
      </header>

      <ListSection title={t('recipeUpgradeChanges')} items={displayUpgrade.changes} />
      <ListSection title={t('recipeUpgradeIngredients')} items={displayUpgrade.upgradedIngredients} />
      <ListSection title={t('recipeUpgradePrepNotes')} items={displayUpgrade.preparationNotes} />

      {displayUpgrade.servingSuggestion && (
        <div className="recipe-upgrade__section">
          <h4>{t('recipeUpgradeServing')}</h4>
          <p>{displayUpgrade.servingSuggestion}</p>
        </div>
      )}

      {displayUpgrade.premiumTouch && (
        <div className="recipe-upgrade__section">
          <h4>{t('recipeUpgradePremiumTouch')}</h4>
          <p>{displayUpgrade.premiumTouch}</p>
        </div>
      )}

      {displayUpgrade.nutritionImpact && (
        <div className="recipe-upgrade__section">
          <h4>{t('recipeUpgradeNutrition')}</h4>
          <p>{displayUpgrade.nutritionImpact}</p>
        </div>
      )}
    </article>
  )
}
