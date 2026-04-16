
import { useCallback } from 'react';
import { toast } from 'sonner';

export const useAdminNotifications = () => {
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio context not supported or blocked", e);
    }
  }, []);

  const notifyNewArrival = useCallback((fileName: string) => {
    playNotificationSound();
    toast.info(`Nouveau flux reçu: ${fileName}`, {
      duration: 5000,
      position: 'top-right',
    });
  }, [playNotificationSound]);

  return { notifyNewArrival, playNotificationSound };
};
