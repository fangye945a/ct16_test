const OTA_HEADER_SIZE = 102
const FIRMWARE_OFFSET_POSITION = 33
const FIRMWARE_SIZE_POSITION = 37
const RKIMAGE_HEADER_SIZE = 140
const RKIMAGE_ITEM_SIZE = 112
const RKIMAGE_ITEM_NAME_SIZE = 32
const RKIMAGE_ITEM_OFFSET_POSITION = 96
const RKIMAGE_ITEM_SIZE_POSITION = 108
const RKIMAGE_ITEM_COUNT_POSITION = 136
const MAX_RKIMAGE_ITEMS = 32
const MAX_OTA_FLAG_SIZE = 4 * 1024
const OTA_FLAG_ITEM_NAME = 'ota-flag'
const textDecoder = new TextDecoder()

export interface OtaPackageFlag {
  product: string
  version: string
  buildDate: string
}

function packageError(_message?: string): Error {
  return new Error('文件格式不支持')
}

function readAscii(bytes: Uint8Array): string {
  return textDecoder.decode(bytes)
}

function readCString(bytes: Uint8Array): string {
  const end = bytes.indexOf(0)
  return readAscii(end === -1 ? bytes : bytes.slice(0, end))
}

async function readFileRange(file: File, offset: number, size: number): Promise<Uint8Array> {
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(size) || offset < 0 || size < 0 || offset + size > file.size) {
    throw packageError('升级包数据范围无效')
  }
  return new Uint8Array(await file.slice(offset, offset + size).arrayBuffer())
}

function parseOtaFlag(value: unknown): OtaPackageFlag {
  if (!value || typeof value !== 'object') throw packageError('OTA 标识内容无效')
  const otaFlag = value as Record<string, unknown>
  if (
    typeof otaFlag.product !== 'string'
    || typeof otaFlag.version !== 'string'
    || typeof otaFlag.buildDate !== 'string'
  ) {
    throw packageError('OTA 标识格式不受支持')
  }
  return {
    product: otaFlag.product,
    version: otaFlag.version,
    buildDate: otaFlag.buildDate,
  }
}

export async function readOtaPackageFlag(file: File): Promise<OtaPackageFlag> {
  if (!file.name.toLowerCase().endsWith('.img')) throw packageError('仅支持 .img OTA 升级包')
  if (file.size < OTA_HEADER_SIZE) throw packageError('升级包头不完整')

  const header = await readFileRange(file, 0, OTA_HEADER_SIZE)
  if (readAscii(header.slice(0, 4)) !== 'RKFW') throw packageError('缺少 RKFW 升级包标识')

  const headerView = new DataView(header.buffer, header.byteOffset, header.byteLength)
  if (headerView.getUint16(4, true) !== OTA_HEADER_SIZE) throw packageError('升级包头长度错误')

  const firmwareOffset = headerView.getUint32(FIRMWARE_OFFSET_POSITION, true)
  const firmwareSize = headerView.getUint32(FIRMWARE_SIZE_POSITION, true)
  if (firmwareOffset < OTA_HEADER_SIZE || firmwareSize < RKIMAGE_HEADER_SIZE || firmwareOffset + firmwareSize > file.size) {
    throw packageError('升级包固件区范围错误')
  }

  const rkImageHeader = await readFileRange(file, firmwareOffset, RKIMAGE_HEADER_SIZE)
  if (readAscii(rkImageHeader.slice(0, 4)) !== 'RKAF') throw packageError('缺少 RKAF 固件索引')

  const rkImageView = new DataView(rkImageHeader.buffer, rkImageHeader.byteOffset, rkImageHeader.byteLength)
  const itemCount = rkImageView.getInt32(RKIMAGE_ITEM_COUNT_POSITION, true)
  if (itemCount < 1 || itemCount > MAX_RKIMAGE_ITEMS) throw packageError('升级包条目数量错误')

  const indexSize = RKIMAGE_HEADER_SIZE + itemCount * RKIMAGE_ITEM_SIZE
  if (indexSize > firmwareSize) throw packageError('升级包索引不完整')
  const index = await readFileRange(file, firmwareOffset, indexSize)
  const indexView = new DataView(index.buffer, index.byteOffset, index.byteLength)

  for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
    const itemStart = RKIMAGE_HEADER_SIZE + itemIndex * RKIMAGE_ITEM_SIZE
    if (readCString(index.slice(itemStart, itemStart + RKIMAGE_ITEM_NAME_SIZE)) !== OTA_FLAG_ITEM_NAME) continue

    const flagOffset = indexView.getUint32(itemStart + RKIMAGE_ITEM_OFFSET_POSITION, true)
    const flagSize = indexView.getUint32(itemStart + RKIMAGE_ITEM_SIZE_POSITION, true)
    if (flagSize === 0 || flagSize > MAX_OTA_FLAG_SIZE || flagOffset + flagSize > firmwareSize) {
      throw packageError('OTA 标识文件范围错误')
    }
    const flagBytes = await readFileRange(file, firmwareOffset + flagOffset, flagSize)
    try {
      return parseOtaFlag(JSON.parse(textDecoder.decode(flagBytes)))
    } catch (error) {
      if (error instanceof Error && error.message === '文件格式不支持') throw error
      throw packageError('OTA 标识不是有效 JSON')
    }
  }

  throw packageError('未找到 OTA 标识')
}
