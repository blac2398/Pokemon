import Dexie from 'dexie'

export const LANGUAGES = {
  ENGLISH: 'en',
  JAPANESE: 'jp',
}

// Builds a stable slot id from language and National Dex number.
export const buildSlotId = (lang, dexNum) => `${lang}:${dexNum}`

class PokedexTrackerDatabase extends Dexie {
  constructor() {
    super('PokedexTrackerDB')

    this.version(1).stores({
      // id format: ${lang}:${dexNum}
      pokedex: '&n, name',
      slots: '&id, lang, dexNum, addedAt',
      meta: '&key',
    })
  }
}

export const db = new PokedexTrackerDatabase()
