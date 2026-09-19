import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';
import { speakText } from './useVoice';

// ── Web Audio API Cash Register Bell Chime Synthesizer ───────────────
export function playOrderChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // Pleasant 4-note ascending bell chime: E5, G#5, B5, E6
    const freqs = [659.25, 830.61, 987.77, 1318.51];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      // Bell envelope (quick attack, long exponential decay)
      gain.gain.setValueAtTime(0.001, now + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.35, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.95);
    });
  } catch (e) {
    console.warn('Audio chime playback failed:', e);
  }
}

// ── Real-time Online Order Listener & Alert Hook ──────────────────────
export function useOrderAlerts({ enabled = true, onNewOrder } = {}) {
  const [activeAlert, setActiveAlert] = useState(null);
  const lastSeenIdRef = useRef(0);
  const initialSyncRef = useRef(false);

  const triggerAlert = useCallback((order) => {
    // 1. Play ringing bell chime sound
    playOrderChime();

    // 2. Play speech notification (English)
    speakText(`New online order received! Amount Rupees ${order.grand_total}`, 'en');

    // 3. Desktop browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(`🛍️ New Online Order #${order.order_number}`, {
          body: `${order.recipient_name} — ₹${order.grand_total} (${order.item_count} items)`,
          icon: '/icon-192.png',
        });
      } catch {}
    }

    // 4. Update UI modal state
    setActiveAlert(order);
    if (onNewOrder) onNewOrder(order);
  }, [onNewOrder]);

  useEffect(() => {
    if (!enabled) return;

    // Request notification permission once
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    let isMounted = true;

    // Polling function
    const checkForNewOrders = async () => {
      try {
        const { data } = await api.get('/orders/latest-alert', {
          params: { after_id: lastSeenIdRef.current },
        });

        if (!isMounted) return;

        if (data && data.has_new && data.order) {
          const newOrder = data.order;
          if (!initialSyncRef.current) {
            // First run: sync latest ID without ringing for historical orders
            lastSeenIdRef.current = newOrder.id;
            initialSyncRef.current = true;
          } else if (newOrder.id > lastSeenIdRef.current) {
            lastSeenIdRef.current = newOrder.id;
            triggerAlert(newOrder);
          }
        } else {
          initialSyncRef.current = true;
        }
      } catch (err) {
        // Ignore silent poll errors
      }
    };

    // Initial check
    checkForNewOrders();

    // Poll every 5 seconds
    const interval = setInterval(checkForNewOrders, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [enabled, triggerAlert]);

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  return {
    activeAlert,
    dismissAlert,
    triggerAlert,
  };
}
