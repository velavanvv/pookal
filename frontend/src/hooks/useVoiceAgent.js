import { useState, useRef, useCallback, useEffect } from 'react';
import api from '../services/api';
import { speakText, stopSpeaking } from './useVoice';

export function useVoiceAgent({ onCartUpdated, onOrderPlaced, onNavigateCategory } = {}) {
  const [status, setStatus] = useState('idle'); // 'idle' | 'listening' | 'speaking' | 'processing' | 'error'
  const [transcript, setTranscript] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [sessionId, setSessionId] = useState(() => 'session-' + Math.random().toString(36).slice(2, 9));
  const [activeVisualizer, setActiveVisualizer] = useState(false);

  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);

  // Bot Voice Reply in English
  const agentSpeak = useCallback((text, onEnd = null) => {
    setStatus('speaking');
    isSpeakingRef.current = true;
    setChatLog(prev => [...prev, {
      sender: 'agent',
      name: 'Vela (Voice Assistant)',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    speakText(text, 'en', () => {
      isSpeakingRef.current = false;
      setStatus('listening');
      if (onEnd) onEnd();
    });
  }, []);

  // Process English Speech & Execute AI Tools
  const processEnglishIntent = useCallback(async (userText) => {
    if (!userText || !userText.trim()) return;
    const clean = userText.trim();

    setChatLog(prev => [...prev, {
      sender: 'user',
      name: 'You',
      text: clean,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    setStatus('processing');
    const lower = clean.toLowerCase();

    try {
      // 1. ADD TO CART INTENT
      // Examples: "Add 2 jasmine to cart", "Put rose garland in cart", "buy marigold"
      if (/add|buy|cart|put|order.*item/i.test(lower) && !/show|view|look/i.test(lower)) {
        let flowerName = 'Madurai Jasmine';
        let qty = 1;

        const numMatch = clean.match(/\d+/) || clean.match(/(one|two|three|four|five|six|seven|eight|nine|ten)/i);
        if (numMatch) {
          const wordMap = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
          qty = wordMap[numMatch[0].toLowerCase()] || parseInt(numMatch[0], 10) || 1;
        }

        if (/malli|jasmine/i.test(lower)) flowerName = 'Madurai Jasmine';
        else if (/rose garland|paneer rose/i.test(lower)) flowerName = 'Red Rose Garland';
        else if (/marigold|sevvanthi/i.test(lower)) flowerName = 'Yellow Marigold';
        else if (/tulasi/i.test(lower)) flowerName = 'Tulasi Garland';
        else if (/lotus/i.test(lower)) flowerName = 'Lotus Flower';
        else if (/combo|pooja pack/i.test(lower)) flowerName = 'Daily Pooja Combo';
        else if (/arali/i.test(lower)) flowerName = 'Red Arali';
        else if (/bouquet/i.test(lower)) flowerName = 'Royal Red Rose Hand Bouquet';

        const { data } = await api.post('/voice/tools/cart', {
          session_id: sessionId,
          action: 'add',
          product_name: flowerName,
          qty,
        });

        if (onCartUpdated) onCartUpdated(data.items);
        agentSpeak(`Added ${qty} ${flowerName} to your cart successfully.`);
        return;
      }

      // 2. SEARCH / DISPLAY FLOWERS INTENT
      // Examples: "Show jasmine", "Show garlands", "Search roses", "Browse pooja pack"
      if (/show|view|search|find|browse|display|open/i.test(lower) && !/cart|bill|checkout/i.test(lower)) {
        let category = null;
        let query = clean;

        if (/garland/i.test(lower)) category = 'Garland';
        else if (/pooja|daily/i.test(lower)) category = 'Daily Pooja';
        else if (/loose/i.test(lower)) category = 'Loose Flower';
        else if (/combo/i.test(lower)) category = 'Combo';
        else if (/bouquet/i.test(lower)) category = 'Bouquet';

        if (category && onNavigateCategory) {
          onNavigateCategory(category);
        }

        const { data } = await api.get('/voice/tools/search', {
          params: { q: query, category }
        });

        agentSpeak(`Here are the matching flowers for you.`);
        return;
      }

      // 3. VIEW CART INTENT
      // Examples: "Show cart", "View cart", "How much is total", "Check cart"
      if (/cart|total|bill|basket/i.test(lower)) {
        const { data } = await api.post('/voice/tools/cart', {
          session_id: sessionId,
          action: 'get',
        });

        if (onCartUpdated) onCartUpdated(data.items);
        agentSpeak(`Your cart is ready with items.`);
        return;
      }

      // 4. ORDER / CHECKOUT INTENT
      // Examples: "Place order", "Checkout", "Confirm order", "Book order"
      if (/place order|checkout|confirm order|book order/i.test(lower)) {
        const { data } = await api.post('/voice/tools/order', {
          session_id: sessionId,
          delivery_time_slot: '6:00 AM – 8:00 AM (Morning Pooja)',
        });

        if (onOrderPlaced) onOrderPlaced(data);
        agentSpeak(`Your order has been placed successfully. Guaranteed delivery between 6:00 AM and 8:00 AM!`);
        return;
      }

      // Default Friendly English Response
      agentSpeak(`Hello! I am Vela. You can say "Add 2 Jasmine to cart", "Show Rose Garlands", or "View Cart".`);
    } catch (err) {
      console.error('Voice tool execution error:', err);
      agentSpeak('Sorry, I encountered an issue processing your request. Please try again.');
    }
  }, [sessionId, onCartUpdated, onOrderPlaced, onNavigateCategory, agentSpeak]);

  // Start Voice Session (English)
  const startListening = useCallback(() => {
    stopSpeaking();
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use Chrome or Safari.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setStatus('listening');
        setActiveVisualizer(true);
      };

      recognition.onresult = (event) => {
        if (isSpeakingRef.current) return;

        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0].transcript;
          if (event.results[i].isFinal) final += piece;
          else interim += piece;
        }

        const current = final || interim;
        setTranscript(current);

        if (final && final.trim()) {
          processEnglishIntent(final.trim());
        }
      };

      recognition.onerror = (e) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Speech error:', e.error);
        }
      };

      recognition.onend = () => {
        if (status === 'listening' && !isSpeakingRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognitionRef.current = recognition;
      recognition.start();

      if (chatLog.length === 0) {
        agentSpeak('Hello! I am Vela. What flowers would you like to order today?');
      }
    } catch (e) {
      console.warn('Voice start failed', e);
    }
  }, [status, chatLog.length, processEnglishIntent, agentSpeak]);

  const stopListening = useCallback(() => {
    stopSpeaking();
    setActiveVisualizer(false);
    setStatus('idle');
    try {
      recognitionRef.current?.abort();
    } catch {}
  }, []);

  const toggleVoice = useCallback(() => {
    if (status === 'idle') {
      startListening();
    } else {
      stopListening();
    }
  }, [status, startListening, stopListening]);

  return {
    status,
    transcript,
    chatLog,
    activeVisualizer,
    startListening,
    stopListening,
    toggleVoice,
    processEnglishIntent,
  };
}
