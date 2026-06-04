import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  speechRecognitionLang,
} from '../utils/speechTranscription'

/**
 * @param {{ onTranscript?: (text: string) => void, disabled?: boolean }} options
 */
export function useSpeechRecognition({ onTranscript, disabled = false } = {}) {
  const { t, language } = useLanguage()
  const [isRecording, setIsRecording] = useState(false)
  const [errorKey, setErrorKey] = useState(null)
  const recognitionRef = useRef(null)
  const transcriptRef = useRef('')
  const stoppedByUserRef = useRef(false)
  const errorKeyRef = useRef(null)

  const supported = isSpeechRecognitionSupported()

  const cleanupRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onresult = null
      recognitionRef.current.onerror = null
      recognitionRef.current.onend = null
      recognitionRef.current = null
    }
  }, [])

  const setError = useCallback((key) => {
    errorKeyRef.current = key
    setErrorKey(key)
  }, [])

  const clearError = useCallback(() => {
    errorKeyRef.current = null
    setErrorKey(null)
  }, [])

  const stopRecording = useCallback(() => {
    stoppedByUserRef.current = true
    recognitionRef.current?.stop()
  }, [])

  const startRecording = useCallback(() => {
    if (disabled || isRecording) return

    clearError()

    if (!supported) {
      setError('voiceInputUnsupported')
      return
    }

    const recognition = createSpeechRecognition()
    if (!recognition) {
      setError('voiceInputUnsupported')
      return
    }

    transcriptRef.current = ''
    stoppedByUserRef.current = false
    recognition.lang = speechRecognitionLang(language)
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (event) => {
      let chunk = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        if (result.isFinal) {
          chunk += result[0]?.transcript ?? ''
        }
      }
      if (chunk) {
        transcriptRef.current = `${transcriptRef.current} ${chunk}`.trim()
      }
    }

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('voiceInputPermissionDenied')
      } else if (event.error === 'no-speech') {
        setError('voiceInputNoSpeech')
      } else {
        setError('voiceInputTranscriptionFailed')
      }
      setIsRecording(false)
      cleanupRecognition()
    }

    recognition.onend = () => {
      setIsRecording(false)
      cleanupRecognition()

      if (errorKeyRef.current) return

      const text = transcriptRef.current.trim()
      if (stoppedByUserRef.current) {
        if (text) {
          onTranscript?.(text)
        } else {
          setError('voiceInputNoSpeech')
        }
      }
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
      setIsRecording(true)
    } catch {
      setError('voiceInputTranscriptionFailed')
      cleanupRecognition()
    }
  }, [
    cleanupRecognition,
    clearError,
    disabled,
    isRecording,
    language,
    onTranscript,
    setError,
    supported,
  ])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  useEffect(
    () => () => {
      stoppedByUserRef.current = true
      try {
        recognitionRef.current?.abort?.()
      } catch {
        recognitionRef.current?.stop?.()
      }
      cleanupRecognition()
    },
    [cleanupRecognition],
  )

  return {
    supported,
    isRecording,
    errorMessage: errorKey ? t(errorKey) : '',
    errorKey,
    startRecording,
    stopRecording,
    toggleRecording,
    clearError,
  }
}
