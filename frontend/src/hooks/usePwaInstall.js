import { useState, useEffect } from 'react';

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [dismissed,   setDismissed]   = useState(
    () => localStorage.getItem('pwa_install_dismissed') === '1'
  );

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') setPromptEvent(null);
  };

  const dismiss = () => {
    localStorage.setItem('pwa_install_dismissed', '1');
    setDismissed(true);
  };

  const show = !!promptEvent && !dismissed;

  return { show, install, dismiss };
}
