import { useLanguage } from '../i18n/useLanguage'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import './VoiceInputButton.css'

/**
 * @param {{ onTranscript: (text: string) => void, disabled?: boolean, className?: string }} props
 */
export default function VoiceInputButton({ onTranscript, disabled = false, className = '' }) {
  const { t } = useLanguage()
  const { isRecording, errorMessage, toggleRecording, stopRecording, clearError } =
    useSpeechRecognition({
      onTranscript: (text) => {
        clearError()
        onTranscript(text)
      },
      disabled,
    })

  return (
    <div className={`voice-input ${className}`.trim()}>
      <div className="voice-input__controls">
        {!isRecording ? (
          <button
            type="button"
            className="voice-input__mic"
            onClick={toggleRecording}
            disabled={disabled}
            aria-label={t('voiceInputMicLabel')}
          >
            🎙️
          </button>
        ) : (
          <>
            <span className="voice-input__status" aria-live="polite">
              {t('voiceInputRecording')}
            </span>
            <button
              type="button"
              className="voice-input__stop"
              onClick={stopRecording}
            >
              {t('voiceInputStop')}
            </button>
          </>
        )}
      </div>
      {errorMessage && (
        <p className="voice-input__error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
