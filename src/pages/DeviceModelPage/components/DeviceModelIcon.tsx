/*
 * Copyright (c) 2026 Hunan OpenValley Digital Industry Development Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Database, ImagePlus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { GetDeviceModelIcon } from '@/services/deviceModelIcons';

const ICON_SIZE = 400;

type IconModel = {
  id: string;
  version: string;
};

type Position = {
  x: number;
  y: number;
};

function IsPngFile(file: File): boolean {
  return file.type === 'image/png' || file.name.toLocaleLowerCase().endsWith('.png');
}

function CreateObjectUrl(blob: Blob | null): string | null {
  return blob ? URL.createObjectURL(blob) : null;
}

function ClampPosition(image: HTMLImageElement, scale: number, position: Position): Position {
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  return {
    x: Math.min(0, Math.max(ICON_SIZE - width, position.x)),
    y: Math.min(0, Math.max(ICON_SIZE - height, position.y)),
  };
}

function GetInitialCrop(image: HTMLImageElement): { scale: number; position: Position } {
  const scale = Math.max(ICON_SIZE / image.naturalWidth, ICON_SIZE / image.naturalHeight);
  return {
    scale,
    position: {
      x: (ICON_SIZE - image.naturalWidth * scale) / 2,
      y: (ICON_SIZE - image.naturalHeight * scale) / 2,
    },
  };
}

function LoadImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(sourceUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error('无法读取 PNG 图像'));
    };
    image.src = sourceUrl;
  });
}

function ToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('生成模型图标失败'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
}

function IconCropDialog({
  open,
  initialIcon,
  onClose,
  onSaved,
}: {
  open: boolean;
  initialIcon: Blob | null;
  onClose: () => void;
  onSaved: (icon: Blob) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [baseScale, setBaseScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<{ pointerId: number; x: number; y: number; position: Position } | null>(null);

  const SetCropImage = async (source: Blob) => {
    try {
      const nextImage = await LoadImage(source);
      const initialCrop = GetInitialCrop(nextImage);
      setImage(nextImage);
      setBaseScale(initialCrop.scale);
      setZoom(1);
      setPosition(initialCrop.position);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '读取模型图标失败');
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    if (initialIcon) {
      void SetCropImage(initialIcon);
      return;
    }
    setImage(null);
    setBaseScale(1);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [open, initialIcon]);

  const scale = baseScale * zoom;

  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    context.clearRect(0, 0, ICON_SIZE, ICON_SIZE);
    if (image) {
      context.drawImage(image, position.x, position.y, image.naturalWidth * scale, image.naturalHeight * scale);
    }
  }, [image, position, scale]);

  const HandleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }
    if (!IsPngFile(file)) {
      toast.error('模型图标仅支持 PNG 格式');
      return;
    }
    void SetCropImage(file);
  };

  const HandleZoom = (nextZoom: number) => {
    if (!image) {
      return;
    }
    const previousScale = baseScale * zoom;
    const nextScale = baseScale * nextZoom;
    const centerX = ICON_SIZE / 2;
    const centerY = ICON_SIZE / 2;
    const nextPosition = ClampPosition(image, nextScale, {
      x: centerX - (centerX - position.x) * (nextScale / previousScale),
      y: centerY - (centerY - position.y) * (nextScale / previousScale),
    });
    setZoom(nextZoom);
    setPosition(nextPosition);
  };

  const HandlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!image) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStart({ pointerId: event.pointerId, x: event.clientX, y: event.clientY, position });
  };

  const HandlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!image || !dragStart || dragStart.pointerId !== event.pointerId) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const nextPosition = ClampPosition(image, scale, {
      x: dragStart.position.x + ((event.clientX - dragStart.x) * ICON_SIZE) / rect.width,
      y: dragStart.position.y + ((event.clientY - dragStart.y) * ICON_SIZE) / rect.height,
    });
    setPosition(nextPosition);
  };

  const HandlePointerEnd = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (dragStart?.pointerId === event.pointerId) {
      setDragStart(null);
    }
  };

  const ResetCrop = () => {
    if (!image) {
      return;
    }
    const initialCrop = GetInitialCrop(image);
    setBaseScale(initialCrop.scale);
    setZoom(1);
    setPosition(initialCrop.position);
  };

  const SaveCrop = async () => {
    const canvas = previewCanvasRef.current;
    if (!image || !canvas) {
      toast.error('请先选择 PNG 模型图标');
      return;
    }
    try {
      onSaved(await ToPngBlob(canvas));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存模型图标失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border/40 bg-card/95">
        <DialogHeader>
          <DialogTitle>裁切模型图标</DialogTitle>
          <DialogDescription>仅保存 400×400 的 PNG 图标。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="mx-auto w-full max-w-xs overflow-hidden rounded-lg border border-border/60 bg-muted/40">
            <canvas
              ref={previewCanvasRef}
              width={ICON_SIZE}
              height={ICON_SIZE}
              className={`block aspect-square w-full ${image ? 'cursor-move touch-none' : ''}`}
              onPointerDown={HandlePointerDown}
              onPointerMove={HandlePointerMove}
              onPointerUp={HandlePointerEnd}
              onPointerCancel={HandlePointerEnd}
            />
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,.png" className="hidden" onChange={HandleFileChange} />
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-3.5" />
              选择 PNG
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={!image} onClick={ResetCrop}>
              <RotateCcw className="size-3.5" />
              重置
            </Button>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Label htmlFor="model-icon-zoom">缩放</Label>
              <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              id="model-icon-zoom"
              type="range"
              min="1"
              max="4"
              step="0.01"
              value={zoom}
              disabled={!image}
              className="w-full accent-primary"
              onChange={(event) => HandleZoom(Number(event.target.value))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>取消</Button>
          <Button type="button" disabled={!image} onClick={() => void SaveCrop()}>保存图标</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * 展示设备模型图标，不存在已上传图标时显示默认占位图。
 */
export function DeviceModelIcon({
  model,
  blob,
  className = '',
  imageClassName = '',
}: {
  model?: IconModel | null;
  blob?: Blob | null;
  className?: string;
  imageClassName?: string;
}) {
  const [icon, setIcon] = useState<Blob | null>(null);
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (blob !== undefined) {
      setIcon(blob);
      return () => {
        active = false;
      };
    }
    if (!model) {
      setIcon(null);
      return () => {
        active = false;
      };
    }
    void GetDeviceModelIcon(model.id, model.version)
      .then((nextIcon) => {
        if (active) {
          setIcon(nextIcon);
        }
      })
      .catch(() => {
        if (active) {
          setIcon(null);
        }
      });
    return () => {
      active = false;
    };
  }, [blob, model?.id, model?.version]);

  useEffect(() => {
    const nextUrl = CreateObjectUrl(icon);
    setIconUrl(nextUrl);
    return () => {
      if (nextUrl) {
        URL.revokeObjectURL(nextUrl);
      }
    };
  }, [icon]);

  if (iconUrl) {
    return <img src={iconUrl} alt="模型图标" className={imageClassName || className} />;
  }
  return (
    <div className={`flex items-center justify-center bg-primary/10 text-primary ${className}`}>
      <Database className="size-4" />
    </div>
  );
}

/**
 * 设备模型表单中的图标选择、预览和移除控件。
 */
export function DeviceModelIconField({
  model,
  value,
  onChange,
}: {
  model?: IconModel | null;
  value: Blob | null | undefined;
  onChange: (icon: Blob | null) => void;
}) {
  const [storedIcon, setStoredIcon] = useState<Blob | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!model) {
      setStoredIcon(null);
      return () => {
        active = false;
      };
    }
    void GetDeviceModelIcon(model.id, model.version)
      .then((icon) => {
        if (active) {
          setStoredIcon(icon);
        }
      })
      .catch(() => {
        if (active) {
          setStoredIcon(null);
        }
      });
    return () => {
      active = false;
    };
  }, [model?.id, model?.version]);

  const activeIcon = value === undefined ? storedIcon : value;

  return (
    <div className="space-y-2">
      <Label>模型图标</Label>
      <div className="flex flex-wrap items-center gap-3">
        <DeviceModelIcon model={model} blob={activeIcon} className="size-16 overflow-hidden rounded-lg" imageClassName="size-16 rounded-lg border border-border/60 object-cover" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
            <ImagePlus className="size-3.5" />
            {activeIcon ? '替换图标' : '上传图标'}
          </Button>
          {activeIcon && (
            <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => onChange(null)}>
              <Trash2 className="size-3.5" />
              移除
            </Button>
          )}
        </div>
      </div>
      <IconCropDialog open={editorOpen} initialIcon={activeIcon} onClose={() => setEditorOpen(false)} onSaved={onChange} />
    </div>
  );
}
