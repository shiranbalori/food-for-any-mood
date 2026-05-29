const STORAGE_KEY = 'food-for-any-mood-shopping-list'
const STORAGE_VERSION = 1

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { version: STORAGE_VERSION, lists: {} }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return { version: STORAGE_VERSION, lists: {} }
    }

    return {
      version: STORAGE_VERSION,
      lists: parsed.lists && typeof parsed.lists === 'object' ? parsed.lists : {},
    }
  } catch {
    return { version: STORAGE_VERSION, lists: {} }
  }
}

function writeStore(lists) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: STORAGE_VERSION, lists }),
    )
    return true
  } catch {
    return false
  }
}

export function getShoppingListChecked(recipeId) {
  if (!recipeId) return {}
  const store = readStore()
  const entry = store.lists[recipeId]
  if (!entry?.checked || typeof entry.checked !== 'object') return {}

  const result = {}
  for (const [key, value] of Object.entries(entry.checked)) {
    if (value) result[Number(key)] = true
  }
  return result
}

export function setShoppingListItemChecked(recipeId, itemIndex, checked) {
  if (!recipeId) return

  const store = readStore()
  const current = store.lists[recipeId]?.checked ?? {}
  const key = String(itemIndex)

  const nextChecked = { ...current }
  if (checked) {
    nextChecked[key] = true
  } else {
    delete nextChecked[key]
  }

  store.lists[recipeId] = { checked: nextChecked }
  writeStore(store.lists)
}

export function clearShoppingListChecked(recipeId) {
  if (!recipeId) return

  const store = readStore()
  if (!store.lists[recipeId]) return

  delete store.lists[recipeId]
  writeStore(store.lists)
}
