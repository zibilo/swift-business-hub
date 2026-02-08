
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useAdminNotifications = () => {
  const playBeep = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
    }
  }, []);

  const notifyNewArrival = useCallback((itemName: string) => {
    playBeep();
    toast.info('Nouvel arrivage détecté', {
      description: `Un nouveau dossier "${itemName}" a été téléversé.`,
      duration: 5000,
    });
  }, [playBeep]);

  return { playBeep, notifyNewArrival };
};
