import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { authApi } from '@/api/endpoints';
import { useAuthStore } from '@/store/useAuthStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications(): void {
  const token = useAuthStore((s) => s.token);
  const registeredForTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || registeredForTokenRef.current === token) {
      return;
    }

    let cancelled = false;

    const registerToken = async (): Promise<void> => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
          });
        }

        const existingPerms = await Notifications.getPermissionsAsync();
        let finalStatus = existingPerms.status;

        if (finalStatus !== 'granted') {
          const requestedPerms = await Notifications.requestPermissionsAsync();
          finalStatus = requestedPerms.status;
        }

        if (finalStatus !== 'granted' || cancelled) {
          return;
        }

        const pushToken = await Notifications.getExpoPushTokenAsync();
        if (pushToken.data && !cancelled) {
          await authApi.updatePreferences({ fcm_token: pushToken.data });
          registeredForTokenRef.current = token;
        }
      } catch {
        // Non-fatal on simulators or environments without push credentials
      }
    };

    void registerToken();

    return () => {
      cancelled = true;
    };
  }, [token]);
}
