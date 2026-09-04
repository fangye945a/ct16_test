const ROTATE_AMOUNTS = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
  5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
  4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
  6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]

const CONSTANTS = Array.from({ length: 64 }, (_, index) => Math.floor(Math.abs(Math.sin(index + 1)) * 0x100000000) >>> 0)

function rotateLeft(value: number, count: number): number {
  return (value << count) | (value >>> (32 - count))
}

function wordToHex(word: number): string {
  return [word & 0xff, (word >>> 8) & 0xff, (word >>> 16) & 0xff, (word >>> 24) & 0xff]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function md5(data: Uint8Array): string {
  const bitLength = data.length * 8
  const paddedLength = Math.ceil((data.length + 9) / 64) * 64
  const padded = new Uint8Array(paddedLength)
  padded.set(data)
  padded[data.length] = 0x80
  const view = new DataView(padded.buffer)
  view.setUint32(paddedLength - 8, bitLength >>> 0, true)
  view.setUint32(paddedLength - 4, Math.floor(bitLength / 0x100000000), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476

  for (let offset = 0; offset < paddedLength; offset += 64) {
    const words = new Uint32Array(16)
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, true)
    let a = a0
    let b = b0
    let c = c0
    let d = d0
    for (let index = 0; index < 64; index += 1) {
      let f: number
      let g: number
      if (index < 16) {
        f = (b & c) | (~b & d); g = index
      } else if (index < 32) {
        f = (d & b) | (~d & c); g = (5 * index + 1) % 16
      } else if (index < 48) {
        f = b ^ c ^ d; g = (3 * index + 5) % 16
      } else {
        f = c ^ (b | ~d); g = (7 * index) % 16
      }
      const nextD = d
      d = c
      c = b
      b = (b + rotateLeft((a + f + CONSTANTS[index] + words[g]) >>> 0, ROTATE_AMOUNTS[index])) >>> 0
      a = nextD
    }
    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }
  return wordToHex(a0) + wordToHex(b0) + wordToHex(c0) + wordToHex(d0)
}

export async function md5Blob(blob: Blob): Promise<string> {
  return md5(new Uint8Array(await blob.arrayBuffer()))
}
