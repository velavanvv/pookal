import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Map locale code → speech recognition & synthesis lang tag
 */
export const LOCALE_TO_SPEECH_LANG = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
};

// Global flag to prevent microphone from picking up the assistant's own voice
if (typeof window !== 'undefined') {
  window.__isAssistantSpeaking = false;
}

/**
 * Text-to-speech utility (voiceover) with onEnd callback and self-hearing prevention
 */
export function speakText(text, locale = 'en', onEnd = null) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  try {
    window.speechSynthesis.cancel(); // cancel any active speech
    window.__isAssistantSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    const langCode = LOCALE_TO_SPEECH_LANG[locale] || 'en-IN';
    utterance.lang = langCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const finish = () => {
      // 400ms grace period to ensure microphone doesn't capture echo
      setTimeout(() => {
        window.__isAssistantSpeaking = false;
        if (onEnd) onEnd();
      }, 400);
    };

    utterance.onend = finish;
    utterance.onerror = finish;

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
    window.__isAssistantSpeaking = false;
    if (onEnd) onEnd();
  }
}

/**
 * Stop any ongoing TTS speech immediately
 */
export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    window.__isAssistantSpeaking = false;
  }
}

/**
 * useVoice — Web Speech API voice-to-text hook with echo prevention and deduplication
 */
export function useVoice({ lang = 'en-IN', onResult, continuous = false } = {}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  const lastProcessedRef = useRef({ text: '', time: 0 });

  const supported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
  }, []);

  const start = useCallback(() => {
    if (!supported) {
      setError('not_supported');
      return;
    }
    setError(null);
    setTranscript('');

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);
    recognition.onend   = () => setListening(false);

    recognition.onresult = (event) => {
      // Ignore microphone input if the assistant itself is currently speaking
      if (window.__isAssistantSpeaking) {
        return;
      }

      let interim = '';
      let final   = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += piece;
        else interim += piece;
      }
      const current = final || interim;
      setTranscript(current);

      if (final && final.trim()) {
        const clean = final.trim();
        const now = Date.now();
        // Prevent duplicate firing within 1.5 seconds for the exact same phrase
        if (lastProcessedRef.current.text === clean && (now - lastProcessedRef.current.time) < 1500) {
          return;
        }
        lastProcessedRef.current = { text: clean, time: now };
        if (onResult) onResult(clean);
      }
    };

    recognition.onerror = (event) => {
      // Ignore standard non-fatal aborts
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(event.error);
      }
      setListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start error', e);
    }
  }, [lang, continuous, onResult, supported]);

  // Cleanup on unmount
  useEffect(() => () => {
    try {
      recognitionRef.current?.abort();
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  return { listening, transcript, start, stop, toggle, error, supported };
}
