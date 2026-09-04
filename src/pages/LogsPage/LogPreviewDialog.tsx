import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, X } from 'lucide-react'
import { previewFile, type FilePreviewDto } from '@/api/filelog'

interface LogPreviewDialogProps {
  path: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LogPreviewDialog({ path, open, onOpenChange }: LogPreviewDialogProps) {
  const [preview, setPreview] = useState<FilePreviewDto | null>(null)
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState('')
  const [loadMoreError, setLoadMoreError] = useState('')

  const loadPreview = useCallback(async (offset: number, append: boolean) => {
    if (!path) {
      return
    }
    if (append) {
      setLoadingMore(true)
      setLoadMoreError('')
    } else {
      setLoading(true)
      setError('')
      setPreview(null)
      setContent('')
      setNextOffset(0)
      setHasMore(false)
      setLoadMoreError('')
    }

    try {
      const data = await previewFile(path, offset)
      setPreview(data)
      if (!data.binary) {
        setContent((previous) => append ? previous + data.content : data.content)
      }
      setNextOffset(data.nextOffset)
      setHasMore(data.truncated && !data.binary)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载预览失败'
      if (append) {
        setLoadMoreError(message)
      } else {
        setError(message)
      }
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [path])

  useEffect(() => {
    if (!open || !path) {
      return
    }
    void loadPreview(0, false)
  }, [loadPreview, open, path])

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget
    const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 64
    if (isNearBottom && hasMore && !loadingMore) {
      void loadPreview(nextOffset, true)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[90vh] max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border/40 px-6 py-5">
          <div className="flex w-full items-start justify-between gap-4 pr-1">
            <div className="min-w-0">
              <DialogTitle>文本预览</DialogTitle>
              <DialogDescription className="mt-2 truncate" title={path || ''}>{path}</DialogDescription>
            </div>
            <DialogClose
              className="mr-1 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              aria-label="关闭预览"
            >
              <X className="size-4" />
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="min-h-0 px-6 py-4">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              正在加载文本内容...
            </div>
          ) : error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : preview?.binary ? (
            <div className="rounded-md border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
              该文件包含二进制内容，无法按文本格式预览。
            </div>
          ) : (
            <div>
              {hasMore ? (
                <p className="mb-2 text-xs text-muted-foreground">滚动到底部可继续加载下一段 256 KiB 内容。</p>
              ) : null}
              <div onScroll={handleScroll} className="h-[60vh] overflow-y-auto rounded-md border border-border/40 bg-muted/60">
                <pre className="whitespace-pre-wrap break-words p-4 font-mono text-xs leading-5 text-foreground">
                  {content || '文件为空'}
                </pre>
              </div>
              {loadingMore ? (
                <div className="mt-2 flex items-center justify-center text-xs text-muted-foreground">
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                  正在加载下一段内容...
                </div>
              ) : loadMoreError ? (
                <p className="mt-2 text-center text-xs text-destructive">继续加载失败：{loadMoreError}</p>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
