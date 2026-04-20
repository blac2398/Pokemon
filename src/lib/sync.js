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
