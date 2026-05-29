import { useCallback, useEffect, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import {
  clearShoppingListChecked,
  getShoppingListChecked,
  setShoppingListItemChecked,
} from '../utils/shoppingListStorage'
import './ShoppingListModal.css'

export default function ShoppingListModal({
  open,
  onClose,
  recipeId,
  recipeName,
  ingredients = [],
}) {
  const { t, dir, isRtl } = useLanguage()
  const textDir = isRtl ? 'rtl' : dir
  const [checked, setChecked] = useState({})
  const [copyNotice, setCopyNotice] = useState(false)

  useEffect(() => {
    if (open && recipeId) {
      setChecked(getShoppingListChecked(recipeId))
    }
  }, [open, recipeId])

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

  const toggleItem = useCallback(
    (index) => {
      setChecked((prev) => {
        const next = !prev[index]
        setShoppingListItemChecked(recipeId, index, next)
        const updated = { ...prev }
        if (next) updated[index] = true
        else delete updated[index]
        return updated
      })
    },
    [recipeId],
  )

  const handleClear = () => {
    clearShoppingListChecked(recipeId)
    setChecked({})
  }

  const handleCopy = async () => {
    const lines = ingredients.map((item, index) => {
      const prefix = checked[index] ? '✓ ' : '○ '
      return `${prefix}${item}`
    })
    const text = `${recipeName}\n---\n${lines.join('\n')}`

    try {
      await navigator.clipboard.writeText(text)
      setCopyNotice(true)
      window.setTimeout(() => setCopyNotice(false), 2500)
    } catch {
      setCopyNotice(false)
    }
  }

  if (!open) return null

  return (
    <div className="shopping-modal" onClick={onClose} role="presentation">
      <div
        className="shopping-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopping-modal-title"
        dir={textDir}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shopping-modal__header">
          <h2 id="shopping-modal-title">{t('shoppingListTitle')}</h2>
          <p className="shopping-modal__recipe-name">{recipeName}</p>
          <button
            type="button"
            className="shopping-modal__close"
            onClick={onClose}
            aria-label={t('closeShoppingList')}
          >
            ×
          </button>
        </div>

        {ingredients.length === 0 ? (
          <p className="shopping-modal__empty">{t('shoppingListEmpty')}</p>
        ) : (
          <ul className="shopping-modal__list">
            {ingredients.map((item, index) => (
              <li key={`${index}-${item}`}>
                <label className="shopping-modal__item">
                  <input
                    type="checkbox"
                    checked={Boolean(checked[index])}
                    onChange={() => toggleItem(index)}
                  />
                  <span
                    className={
                      checked[index] ? 'shopping-modal__text shopping-modal__text--done' : 'shopping-modal__text'
                    }
                  >
                    {item}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        <div className="shopping-modal__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={handleCopy}
            disabled={ingredients.length === 0}
          >
            {t('copyShoppingList')}
          </button>
          <button
            type="button"
            className="btn btn--ghost shopping-modal__clear"
            onClick={handleClear}
            disabled={ingredients.length === 0}
          >
            {t('clearShoppingChecks')}
          </button>
        </div>

        {copyNotice && (
          <p className="shopping-modal__notice" role="status">
            {t('shoppingListCopied')}
          </p>
        )}
      </div>
    </div>
  )
}
