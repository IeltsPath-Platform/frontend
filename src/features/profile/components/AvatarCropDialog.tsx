import React, { useState, useCallback } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { ZoomIn, ZoomOut, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AvatarCropDialogProps {
  open: boolean
  imageSrc: string | null
  onClose: () => void
  onConfirmCrop: (blob: Blob) => Promise<void>
  isUploading?: boolean
}

/**
 * Creates an image element and waits for it to load
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous')
    image.src = url
  })
}

/**
 * Crops the image using an HTML5 Canvas and exports it as a WebP / JPEG Blob <= 2MB
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('Canvas 2D context không khả dụng.')
  }

  // Set avatar canvas resolution (e.g. 512x512 max for crisp quality)
  const targetSize = Math.min(Math.max(pixelCrop.width, pixelCrop.height), 512)
  canvas.width = targetSize
  canvas.height = targetSize

  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Không thể xuất ảnh từ canvas.'))
          return
        }
        resolve(blob)
      },
      'image/webp',
      0.9
    )
  })
}

export const AvatarCropDialog: React.FC<AvatarCropDialogProps> = ({
  open,
  imageSrc,
  onClose,
  onConfirmCrop,
  isUploading = false,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropError, setCropError] = useState<string | null>(null)

  const onCropChange = useCallback((point: Point) => {
    setCrop(point)
  }, [])

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom)
  }, [])

  const onCropCompleteCallback = useCallback((_croppedArea: Area, currentCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(currentCroppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return
    setCropError(null)
    try {
      const croppedBlob = await getCroppedImg(imageSrc, pixelCropSafe(croppedAreaPixels))
      await onConfirmCrop(croppedBlob)
      onClose()
    } catch (err) {
      setCropError(err instanceof Error ? err.message : 'Có lỗi khi cắt ảnh.')
    }
  }

  function pixelCropSafe(area: Area): Area {
    return {
      x: Math.max(0, Math.round(area.x)),
      y: Math.max(0, Math.round(area.y)),
      width: Math.max(1, Math.round(area.width)),
      height: Math.max(1, Math.round(area.height)),
    }
  }

  if (!open || !imageSrc) return null

  return (
    <div
      className="profile-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div className="profile-crop-card">
        <div className="profile-crop-header">
          <h3 id="crop-modal-title" className="profile-crop-title">
            Chỉnh sửa ảnh đại diện
          </h3>
          <button
            type="button"
            className="profile-crop-close-btn"
            onClick={onClose}
            disabled={isUploading}
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="profile-crop-container">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        <div className="profile-crop-controls">
          <label htmlFor="zoom-slider" className="profile-zoom-label">
            <ZoomOut size={16} aria-hidden="true" />
            <input
              id="zoom-slider"
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="profile-zoom-slider"
              aria-label="Phóng to thu nhỏ ảnh"
              disabled={isUploading}
            />
            <ZoomIn size={16} aria-hidden="true" />
          </label>
        </div>

        {cropError && (
          <div className="profile-crop-error" role="alert">
            {cropError}
          </div>
        )}

        <div className="profile-crop-footer">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isUploading}
            className="profile-crop-cancel-btn"
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isUploading}
            className="profile-crop-save-btn"
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="profile-spinner" aria-hidden="true" />
                Đang lưu ảnh…
              </>
            ) : (
              'Cắt & Lưu ảnh'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

