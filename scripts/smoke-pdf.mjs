// Smoke test for the exact jsPDF calls used by Contracts.tsx (not shipped).
import { jsPDF } from 'jspdf'

const doc = new jsPDF({ unit: 'mm', format: 'a4' })
const W = doc.internal.pageSize.getWidth()
doc.setFont('helvetica', 'bold')
doc.setFontSize(16)
doc.text('MKATABA WA UPANGAJI WA MAKAZI', W / 2, 20, { align: 'center' })
doc.setFont('helvetica', 'normal')
doc.setFontSize(9)
const lines = doc.splitTextToSize(
  'Mpangaji analipa kodi kwa wakati kama ilivyokubalianwa hapo juu.',
  W - 32,
)
lines.forEach((l, i) => doc.text(l, 16, 32 + i * 5.5))
doc.rect(16, 60, W - 32, 30, 'FD')

const buf = doc.output('arraybuffer')
const bytes = new Uint8Array(buf)
const pages = doc.getNumberOfPages()

// Same chunked base64 conversion as src/lib/files.ts
let bin = ''
const CH = 0x8000
for (let i = 0; i < bytes.length; i += CH) bin += String.fromCharCode(...bytes.subarray(i, i + CH))
const b64 = Buffer.from(bin, 'binary').toString('base64')

const header = Buffer.from(bytes.subarray(0, 5)).toString('ascii')
console.log(JSON.stringify({ pages, sizeKB: +(bytes.length / 1024).toFixed(1), header, b64Len: b64.length }, null, 2))
if (header !== '%PDF-') throw new Error('not a PDF')
