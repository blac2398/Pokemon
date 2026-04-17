import { db, buildSlotId, LANGUAGES } from './db'
import pokedexData from '../data/pokedex.json'
import initialOwnedJpDexNumbers from '../data/initial_owned_jp.json'

const SEEDED_META_KEY = 'seeded'

/**
 * Seeds reference data and first-run JP owned slots only when needed.
 */
export async function seedIfEmpty() {
  const pokedexCount = await db.pokedex.count()
  if (pokedexCount === 0) {
    await db.pokedex.bulkPut(pokedexData)
  }

  const seededMeta = await db.meta.get(SEEDED_META_KEY)
  if (seededMeta?.value === true) {
    return
  }

  const now = new Date().toISOString()
  const initialSlots = initialOwnedJpDexNumbers.map((dexNum) => ({
    id: buildSlotId(LANGUAGES.JAPANESE, dexNum),
    lang: LANGUAGES.JAPANESE,
    dexNum,
    setHint: '',
    cardNumber: '',
    notes: '',
    thumbnail: null,
    addedAt: now,
  }))

  await db.slots.bulkPut(initialSlots)
  await db.meta.put({ key: SEEDED_META_KEY, value: true })
}

/**
 * Returns the full Pokédex sorted by National Dex number.
 */
export async function getAllPokedex() {
  return db.pokedex.orderBy('n').toArray()
}

/**
 * Returns every owned slot for the requested language.
 */
export async function getSlots(lang) {
  return db.slots.where('lang').equals(lang).sortBy('dexNum')
}

/**
 * Returns one owned slot for a language and dex number, or undefined.
 */
export async function getSlot(lang, dexNum) {
  return db.slots.get(buildSlotId(lang, dexNum))
}

/**
 * Inserts or replaces a slot using lang and dexNum to build its id.
 */
export async function upsertSlot(slotData) {
  const slot = {
    id: buildSlotId(slotData.lang, slotData.dexNum),
    setHint: '',
    cardNumber: '',
    notes: '',
    thumbnail: null,
    addedAt: new Date().toISOString(),
    ...slotData,
  }

  await db.slots.put(slot)
}

/**
 * Deletes one owned slot by language and dex number.
 */
export async function deleteSlot(lang, dexNum) {
  await db.slots.delete(buildSlotId(lang, dexNum))
}

/**
 * Returns how many slots are owned for the requested language.
 */
export async function getOwnedCount(lang) {
  return db.slots.where('lang').equals(lang).count()
}

/**
 * Reads a meta value and falls back when missing.
 */
export async function getMeta(key, defaultValue = null) {
  const entry = await db.meta.get(key)
  return entry ? entry.value : defaultValue
}

/**
 * Writes one meta value by key.
 */
export async function setMeta(key, value) {
  await db.meta.put({ key, value })
}
