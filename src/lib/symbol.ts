/**
 * Bendera ya Tanzania.
 *
 * Chanzo: Wikimedia Commons — "Flag of Tanzania.svg", leseni umma
 * (public domain). Hauna haja ya kutaja chanzo kisheria, lakini tunataja
 * bado kwa uwazi. Faili zimehifadhiwa ndani ya `public/symbol/` ili ziweze
 * kutumika bila mtandao (app inafanya kazi offline kabisa).
 *
 * Bendera imechaguliwa badala ya Nembo ya Taifa kwa sababu nembo ya taifa ni
 * ya kulindwa chini ya Sheria za Bendera, Nembo na Majina; matumizi yake
 * yanahitaji ruhusa ya mamlaka husika.
 */
export const FLAG_SRC = '/symbol/tz-flag-320.png'
export const FLAG_PDF_SRC = '/symbol/tz-flag-640.png'
export const FLAG_CREDIT = 'Bendera ya Tanzania · Wikimedia Commons · umma (public domain)'

/** jsPDF needs decoded pixels, not a URL — load it up front. */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') return resolve(null)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}
