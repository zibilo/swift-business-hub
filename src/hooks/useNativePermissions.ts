
import { Device } from '@capacitor/device';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useCallback } from 'react';

export const useNativePermissions = () => {
  const checkAndRequestStoragePermissions = useCallback(async () => {
    const info = await Device.getInfo();

    if (info.platform === 'web') {
      return true; // Web uses standard file picker, no native permissions needed
    }

    if (info.platform === 'android') {
      const status = await Filesystem.checkPermissions();
      if (status.publicStorage !== 'granted') {
        const requestStatus = await Filesystem.requestPermissions();
        return requestStatus.publicStorage === 'granted';
      }
    }

    return true; // iOS and others handled by manifest descriptions or are already granted
  }, []);

  return { checkAndRequestStoragePermissions };
};
