import type { ChatAttachment } from './types';

export const MAX_ATTACHMENT_SIZE_BYTES = 7 * 1024 * 1024;
export const MAX_ATTACHMENT_SIZE_LABEL = '7 MB';
export const MAX_ATTACHMENTS = 5;

export const ATTACHMENT_ACCEPT =
  'image/jpeg,image/png,image/gif,image/webp,image/bmp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,text/x-markdown,.jpg,.jpeg,.png,.gif,.webp,.bmp,.pdf,.docx,.txt,.md';

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
]);

const FILE_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
]);

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp']);

const FILE_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.md']);

export function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  if (index < 0) return '';
  return filename.slice(index).toLowerCase();
}

export function resolveAttachmentMeta(
  file: File,
): { type: ChatAttachment['type']; contentType: string } | null {
  const extension = getFileExtension(file.name);
  const mimeType = file.type.toLowerCase();

  if (IMAGE_MIME_TYPES.has(mimeType) || IMAGE_EXTENSIONS.has(extension)) {
    return {
      type: 'image',
      contentType: mimeType || `image/${extension.slice(1) || 'jpeg'}`,
    };
  }

  if (FILE_MIME_TYPES.has(mimeType) || FILE_EXTENSIONS.has(extension)) {
    let contentType = mimeType;
    if (!contentType || (extension === '.md' && contentType === 'text/plain')) {
      if (extension === '.pdf') contentType = 'application/pdf';
      else if (extension === '.docx') {
        contentType =
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (extension === '.md') contentType = 'text/markdown';
      else contentType = 'text/plain';
    }
    return { type: 'file', contentType };
  }

  return null;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function rewriteDataUrlMime(dataUrl: string, contentType: string): string {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl;
  return `data:${contentType};base64,${dataUrl.slice(comma + 1)}`;
}

export type AttachmentBuildError =
  | { kind: 'invalid'; name: string }
  | { kind: 'tooLarge'; name: string }
  | { kind: 'limitReached' };

/** 与 zhos-claw 流程页一致：本地读成 data URL，经 WebSocket 交给 pico 落盘缓存 */
export async function buildChatAttachmentsFromFiles({
  files,
  existingCount,
  maxAttachments = MAX_ATTACHMENTS,
  maxBytes = MAX_ATTACHMENT_SIZE_BYTES,
}: {
  files: File[];
  existingCount: number;
  maxAttachments?: number;
  maxBytes?: number;
}): Promise<{
  attachments: ChatAttachment[];
  errors: AttachmentBuildError[];
}> {
  const errors: AttachmentBuildError[] = [];
  if (files.length === 0) {
    return { attachments: [], errors };
  }

  const remainingSlots = maxAttachments - existingCount;
  if (remainingSlots <= 0) {
    return { attachments: [], errors: [{ kind: 'limitReached' }] };
  }

  const nextAttachments: ChatAttachment[] = [];
  let skippedByLimit = 0;

  for (const file of files) {
    if (nextAttachments.length >= remainingSlots) {
      skippedByLimit += 1;
      continue;
    }

    const meta = resolveAttachmentMeta(file);
    if (!meta) {
      errors.push({ kind: 'invalid', name: file.name });
      continue;
    }

    if (file.size > maxBytes) {
      errors.push({ kind: 'tooLarge', name: file.name });
      continue;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      nextAttachments.push({
        type: meta.type,
        filename: file.name,
        contentType: meta.contentType,
        url: rewriteDataUrlMime(dataUrl, meta.contentType),
      });
    } catch {
      errors.push({ kind: 'invalid', name: file.name });
    }
  }

  if (skippedByLimit > 0) {
    errors.push({ kind: 'limitReached' });
  }

  return { attachments: nextAttachments, errors };
}
