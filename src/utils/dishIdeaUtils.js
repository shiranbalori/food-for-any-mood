export function normalizeDishIdea(text) {
  return String(text ?? '').trim().replace(/\s+/g, ' ')
}

export function hasDishIdea(userInput) {
  return Boolean(normalizeDishIdea(userInput?.dishIdea ?? userInput))
}
