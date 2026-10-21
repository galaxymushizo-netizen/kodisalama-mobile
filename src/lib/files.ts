import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const isNative = () => Capacitor.isNativePlatform()

/** UTF-8 string -> base64 */
export const textToBase64 = (text: string) => bytesToBase64(new TextEncoder().encode(text))

/** Uint8Array -> base64 (chunked, so big PDFs never blow the stack) */
export function bytesToBase64(bytes: Uint8Array): string {
  let bin = ''
  const CH = 0x8000
  for (let i = 0; i < bytes.length; i += CH) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CH))
  }
  return btoa(bin)
}

export type SaveResult = {
  ok: boolean
  via: 'share' | 'file' | 'download'
  uri?: string
  message: string
}

/**
 * Browser: normal download. Android app: writes into Documents/KodiSalama/
 * and opens the system share sheet (WhatsApp, Drive, file manager, "Save to device").
 * Android WebView cannot handle blob downloads, hence the native branch.
 */
export async function saveFile({
  filename,
  base64,
  onBrowser,
}: {
  filename: string
  base64: string
  onBrowser: () => void
}): Promise<SaveResult> {
  if (!isNative()) {
    onBrowser()
    return { ok: true, via: 'download', message: 'Faili limepakuliwa' }
  }

  const path = `KodiSalama/${filename}`
  try {
    const written = await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    })

    try {
      const { uri } = await Filesystem.getUri({ directory: Directory.Documents, path })
      await Share.share({
        files: [uri],
        title: filename,
        dialogTitle: 'Hifadhi au shiriki faili',
      })
      return { ok: true, via: 'share', uri: written.uri, message: 'Faili tayari' }
    } catch {
      // Share sheet dismissed or unavailable — the file is already on the device.
      return {
        ok: true,
        via: 'file',
        uri: written.uri,
        message: `Imehifadhiwa: KodiSalama/${filename}`,
      }
    }
  } catch (e) {
    return { ok: false, via: 'file', message: `Imeshindwa kuhifadhi: ${String(e)}` }
  }
}

/** Copies text, with a legacy fallback where the async Clipboard API is missing. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  } catch {
    return false
  }
}
