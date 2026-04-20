import { db, buildSlotId } from './db'
import pokedexData from '../data/pokedex.json'
import { supabase } from './supabase'
import { pushSlotToCloud, deleteSlotFromCloud } from './sync'

const SEEDED_META_KEY = 'seeded'

/**
 * Reads the current signed-in user id from Supabase auth state.
 * Returns null when signed out or when no session is available.
 */
async function getCurrentUserId() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

/**
 * Seeds reference data only when needed.
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
    updatedAt: new Date().toISOString(),
    ...slotData,
  }

  await db.slots.put(slot)

  // Fire cloud sync in the background so local UI stays instant.
  getCurrentUserId().then((userId) => {
    if (userId) {
      pushSlotToCloud(slot, userId)
    }
  })
}

/**
 * Deletes one owned slot by language and dex number.
 */
export async function deleteSlot(lang, dexNum) {
  await db.slots.delete(buildSlotId(lang, dexNum))

  // Fire cloud sync in the background so local UI stays instant.
  getCurrentUserId().then((userId) => {
    if (userId) {
      deleteSlotFromCloud(lang, dexNum, userId)
    }
  })
}

/**
 * Returns how many slots are owned for the requested language.
 */
export async function getOwnedCount(lang) {
  return db.slots.where('lang').equals(lang).count()
}

/**
 * Clears every owned slot in both languages.
 */
export async function clearCollection() {
  await db.slots.clear()
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
