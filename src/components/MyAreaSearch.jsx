import { useMemo, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { buildAppSearchIndex, searchAppIndex } from '../utils/appSearch'
import './MyAreaSearch.css'

export default function MyAreaSearch({
  savedRecipes = [],
  favoriteRecipes = [],
  mealPlan = {},
  privateRecipes = [],
  communityRecipes = [],
  onSelectResult,
}) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')

  const index = useMemo(
    () =>
      buildAppSearchIndex({
        t,
        savedRecipes,
        favoriteRecipes,
        mealPlan,
        privateRecipes,
        communityRecipes,
      }),
    [t, savedRecipes, favoriteRecipes, mealPlan, privateRecipes, communityRecipes],
  )

  const results = useMemo(() => searchAppIndex(query, index), [query, index])
  const hasQuery = query.trim().length > 0
  const hasResults = results.recipes.length > 0 || results.sections.length > 0

  return (
    <div className="my-area-search">
      <label className="my-area-search__label" htmlFor="my-area-search-input">
        <span className="my-area-search__label-icon" aria-hidden="true">
          🔍
        </span>
        <input
          id="my-area-search-input"
          type="search"
          className="my-area-search__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('myAreaSearchPlaceholder')}
          autoComplete="off"
          enterKeyHint="search"
        />
      </label>

      {hasQuery && (
        <div className="my-area-search__results" role="region" aria-live="polite">
          {!hasResults && <p className="my-area-search__empty">{t('myAreaSearchNoResults')}</p>}

          {results.recipes.length > 0 && (
            <div className="my-area-search__group">
              <h3 className="my-area-search__group-title">{t('myAreaSearchRecipesGroup')}</h3>
              <ul className="my-area-search__list">
                {results.recipes.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="my-area-search__result"
                      onClick={() => onSelectResult?.(item)}
                    >
                      <span className="my-area-search__result-title">{item.title}</span>
                      {item.subtitle && (
                        <span className="my-area-search__result-sub">{item.subtitle}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {results.sections.length > 0 && (
            <div className="my-area-search__group">
              <h3 className="my-area-search__group-title">{t('myAreaSearchSectionsGroup')}</h3>
              <ul className="my-area-search__list">
                {results.sections.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="my-area-search__result my-area-search__result--section"
                      onClick={() => onSelectResult?.(item)}
                    >
                      <span className="my-area-search__result-icon" aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="my-area-search__result-title">{item.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
