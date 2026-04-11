'use client'

import { useRef, useState } from 'react'
import { Mic, MicOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useSettingsStore } from '@/store/settings.store'

// Uses MediaRecorder (browser-native, any browser) + Groq/OpenAI Whisper for transcription.
// Does NOT depend on Chrome's Web Speech API or Google servers.

interface Props {
  onTranscript: (text: string) => void
  disabled?: boolean
}

type State = 'idle' | 'recording' | 'transcribing'

export function VoiceInput({ onTranscript, disabled }: Props) {
  const { language } = useSettingsStore()
  const [state, setState] = useState<State>('idle')
  const [words, setWords]   = useState(0)
  const [error, setError]   = useState('')

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const streamRef    = useRef<MediaStream | null>(null)

  async function handleStart() {
    setError('')
    setWords(0)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
    } catch (e: any) {
      setError(
        e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError'
          ? (language === 'pt'
              ? 'Permissão de microfone negada. Libere o acesso nas configurações do browser.'
              : 'Microphone permission denied.')
          : (language === 'pt' ? 'Microfone não encontrado.' : 'Microphone not found.')
      )
      return
    }

    // Pick best supported format
    const mimeType =
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
      MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' :
      MediaRecorder.isTypeSupported('audio/mp4')              ? 'audio/mp4' :
      ''

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      // Release microphone immediately
      stream.getTracks().forEach(t => t.stop())
      streamRef.current = null

      const effectiveMime = mimeType || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: effectiveMime })

      if (blob.size < 1000) {
        setError(language === 'pt' ? 'Gravação muito curta. Fale por pelo menos 1 segundo.' : 'Recording too short.')
        setState('idle')
        return
      }

      await transcribe(blob, effectiveMime)
    }

    recorderRef.current = recorder
    recorder.start()
    setState('recording')
  }

  function handleStop() {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      setState('transcribing')
      recorderRef.current.stop()
    }
  }

  async function transcribe(blob: Blob, mimeType: string) {
    const ext  = mimeType.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([blob], `recording.${ext}`, { type: mimeType })

    const fd = new FormData()
    fd.append('audio', file)
    fd.append('language', language)

    try {
      const res  = await fetch('/api/ai/transcribe', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Transcription failed')
        setState('idle')
        return
      }

      const transcript = (data.transcript as string).trim()
      if (!transcript) {
        setError(language === 'pt' ? 'Nenhuma fala detectada na gravação.' : 'No speech detected.')
        setState('idle')
        return
      }

      const wordCount = transcript.split(/\s+/).filter(Boolean).length
      setWords(wordCount)
      onTranscript(transcript)
      setState('idle')
    } catch (e: any) {
      setError(e.message ?? 'Network error')
      setState('idle')
    }
  }

  const isRecording    = state === 'recording'
  const isTranscribing = state === 'transcribing'

  const labels = {
    speak:       language === 'pt' ? 'Falar' : 'Speak',
    stop:        language === 'pt' ? 'Parar gravação' : 'Stop recording',
    transcribing:language === 'pt' ? 'Transcrevendo…' : 'Transcribing…',
    recording:   language === 'pt' ? 'Gravando…' : 'Recording…',
    words:       language === 'pt' ? 'palavras capturadas' : 'words captured',
    hint:        language === 'pt'
      ? 'Grave sua resposta e clique Parar — a IA transcreve automaticamente'
      : 'Record your answer and click Stop — AI transcribes automatically',
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Main button */}
        <button
          type="button"
          onClick={isRecording ? handleStop : handleStart}
          disabled={disabled || isTranscribing}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border
            transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? 'bg-red-500 border-red-500 text-white hover:bg-red-600'
              : isTranscribing
              ? 'bg-muted border-border text-muted-foreground cursor-wait'
              : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
          }`}
        >
          {isTranscribing
            ? <Loader2 size={13} className="animate-spin" />
            : isRecording
            ? <MicOff size={13} />
            : <Mic size={13} />
          }
          {isTranscribing ? labels.transcribing
            : isRecording  ? labels.stop
            : labels.speak}
        </button>

        {/* Recording indicator */}
        {isRecording && (
          <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            {labels.recording}
          </span>
        )}

        {/* Success */}
        {state === 'idle' && words > 0 && !error && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <CheckCircle size={12} />
            {words} {labels.words}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle size={11} />
          {error}
        </p>
      )}

      {/* Hint — only on idle with no previous transcript */}
      {state === 'idle' && words === 0 && !error && (
        <p className="text-xs text-muted-foreground">{labels.hint}</p>
      )}
    </div>
  )
}
