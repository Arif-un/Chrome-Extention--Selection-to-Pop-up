/** Google Translate web URL for a selection. Single source for the query contract. */
export function googleTranslateUrl(text: string, targetLang: string): string {
  return `https://translate.google.com/?sl=auto&tl=${targetLang}&text=${encodeURIComponent(text)}&op=translate`
}
