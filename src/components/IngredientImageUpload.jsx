import { useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { analyzeIngredientsImage } from '../services/ingredientImageService'
import './IngredientImageUpload.css'

export default function IngredientImageUpload({ onIngredientsDetected, disabled }) {
  const { t } = useLanguage()
  const fileInputRef = useRef(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [notice, setNotice] = useState(null)
  const [noticeType, setNoticeType] = useState('info')

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const setMessage = (message, type = 'info') => {
    setNotice(message)
    setNoticeType(type)
  }

  const handlePickFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage(t('imageInvalidType'), 'error')
      return
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMessage(null)
  }

  const handleRemoveImage = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(null)
    setPreviewUrl(null)
    setMessage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile || analyzing) return

    setAnalyzing(true)
    setMessage(t('imageAnalyzeLoading'), 'info')

    try {
      const { ingredients, error } = await analyzeIngredientsImage(selectedFile)

      if (error || ingredients.length === 0) {
        setMessage(error || t('imageAnalyzeError'), 'error')
        return
      }

      onIngredientsDetected(ingredients.join(', '))
      setMessage(t('imageAnalyzeSuccess', { count: ingredients.length }), 'success')
    } catch {
      setMessage(t('imageAnalyzeError'), 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="ingredient-image-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="ingredient-image-upload__input"
        onChange={handleFileChange}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="ingredient-image-upload__actions">
        <button
          type="button"
          className="btn btn--secondary ingredient-image-upload__pick"
          onClick={handlePickFile}
          disabled={disabled || analyzing}
        >
          {t('uploadIngredientsImage')}
        </button>

        {selectedFile && (
          <button
            type="button"
            className="btn btn--ghost ingredient-image-upload__remove"
            onClick={handleRemoveImage}
            disabled={disabled || analyzing}
          >
            {t('removeImage')}
          </button>
        )}
      </div>

      {previewUrl && (
        <div className="ingredient-image-upload__preview-wrap">
          <img
            src={previewUrl}
            alt={t('uploadedIngredientsAlt')}
            className="ingredient-image-upload__preview"
          />
        </div>
      )}

      {selectedFile && (
        <button
          type="button"
          className="btn btn--primary ingredient-image-upload__analyze"
          onClick={handleAnalyze}
          disabled={disabled || analyzing}
        >
          {analyzing ? t('imageAnalyzeLoading') : t('detectIngredientsFromImage')}
        </button>
      )}

      {notice && (
        <p
          className={`ingredient-image-upload__notice ingredient-image-upload__notice--${noticeType}`}
          role="status"
        >
          {notice}
        </p>
      )}
    </div>
  )
}
