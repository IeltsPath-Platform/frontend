export type LookupDirection = 'vi-en' | 'en-vi'

export const LOOKUP_MAX_CHARS = 50

export const LOOKUP_TABS: Array<{ id: LookupDirection; label: string; placeholder: string }> = [
  { id: 'vi-en', label: 'Tra Việt-Anh', placeholder: 'Nhập cụm Tiếng Việt cần tra' },
  { id: 'en-vi', label: 'Tra Anh-Việt', placeholder: 'Nhập từ hoặc cụm tiếng Anh cần tra' },
]

/** Wiktionary entries of the looked-up language carry the other language's gloss, so each direction uses its own edition. */
export const lookupUrl = (direction: LookupDirection, term: string) =>
  `https://${direction === 'vi-en' ? 'en' : 'vi'}.wiktionary.org/w/index.php?search=${encodeURIComponent(term)}`
