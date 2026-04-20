import { db } from './db'
import { supabase } from './supabase'

/**
 * Mirrors one local slot row to Supabase.
 * This is best-effort sync: if no user is signed in, skip silently.
 * Errors are logged so UI flow is never interrupted.
 */
export async function pushSlotToCloud(slot, userId) {
  if (!userId || !slot) return

  try {
    const row = {
      // Match the database composite identity: user + language + dex number.
      id: `${userId}:${slot.lang}:${slot.dexNum}`,
      user_id: userId,
      lang: slot.lang,
      dex_num: slot.dexNum,
      set_hint: slot.setHint || '',
      card_number: slot.cardNumber || '',
      notes: slot.notes || '',
      thumbnail: slot.thumbnail || null,
      added_at: slot.addedAt,
      // updated_at is maintained by the database trigger.
    }

    const { error } = await supabase.from('slots').upsert(row, { onConflict: 'id' })
    if (error) {
      console.warn('[sync] pushSlotToCloud failed', error.message, row.id)
    }
  } catch (err) {
    console.warn('[sync] pushSlotToCloud threw', err)
  }
}

/**
 * Removes one slot row from Supabase.
 * This is best-effort sync: if no user is signed in, skip silently.
 * Errors are logged so local UX remains unaffected.
 */
export async function deleteSlotFromCloud(lang, dexNum, userId) {
  if (!userId) return

  try {
    const id = `${userId}:${lang}:${dexNum}`
    const { error } = await supabase.from('slots').delete().eq('id', id)
    if (error) {
      console.warn('[sync] deleteSlotFromCloud failed', error.message, id)
    }
  } catch (err) {
    console.warn('[sync] deleteSlotFromCloud threw', err)
  }
}

/**
 * Pulls all slots for a user from Supabase and merges into local Dexie.
 * Uses last-write-wins based on updated_at timestamps.
 * Returns merge statistics for logging/debugging.
 */
export async function pullSlotsFromCloud(userId) {
  const stats = { pulled: 0, skipped: 0, errors: 0 }
  if (!userId) return stats

  try {
    const { data: rows, error } = await supabase
      .from('slots')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.warn('[sync] pullSlotsFromCloud fetch failed', error.message)
      stats.errors++
      return stats
    }

    if (!rows || rows.length === 0) {
      return stats
    }

    for (const cloudRow of rows) {
      try {
        const slotData = {
          id: `${cloudRow.lang}:${cloudRow.dex_num}`,
          lang: cloudRow.lang,
          dexNum: cloudRow.dex_num,
          setHint: cloudRow.set_hint ?? '',
          cardNumber: cloudRow.card_number ?? '',
          notes: cloudRow.notes ?? '',
          thumbnail: cloudRow.thumbnail ?? null,
          addedAt: cloudRow.added_at,
          updatedAt: cloudRow.updated_at,
        }

        const existing = await db.slots.get(slotData.id)
        if (existing && existing.updatedAt && slotData.updatedAt) {
          const localTime = new Date(existing.updatedAt).getTime()
          const cloudTime = new Date(slotData.updatedAt).getTime()
          if (localTime > cloudTime) {
            stats.skipped++
            continue
          }
        }

        await db.slots.put(slotData)
        stats.pulled++
      } catch (err) {
        console.warn('[sync] failed to merge row', cloudRow.id, err)
        stats.errors++
      }
    }
  } catch (err) {
    console.warn('[sync] pullSlotsFromCloud threw', err)
    stats.errors++
  }

  return stats
}
