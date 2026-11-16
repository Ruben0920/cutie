import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Copy, QrCode, Share2, X } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { coupleApi } from '@/api/endpoints';
import { extractErrorMessage } from '@/api/errors';
import { useAuthStore } from '@/store/useAuthStore';
import { colors, radii, spacing } from '@/theme/colors';

type PairTab = 'invite' | 'join';

function parseInviteCodeFromQr(rawValue: string): string {
  const trimmed = rawValue.trim();
  const match = /[?&]code=([A-Za-z0-9]{6})/i.exec(trimmed);
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  return trimmed.slice(0, 6).toUpperCase();
}

export default function PairScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const setHasSkippedPairing = useAuthStore((s) => s.setHasSkippedPairing);

  const [activeTab, setActiveTab] = useState<PairTab>('invite');
  const [codeInput, setCodeInput] = useState('');
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const scanLockRef = useRef(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const inviteQuery = useQuery({
    queryKey: ['coupleInviteInfo'],
    queryFn: coupleApi.getInviteInfo,
  });

  const joinMutation = useMutation({
    mutationFn: coupleApi.joinCouple,
    onSuccess: async () => {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await queryClient.invalidateQueries({ queryKey: ['coupleDashboard'] });
      setScannerOpen(false);
      router.replace('/(onboarding)/quiz');
    },
    onError: (err: unknown) => {
      scanLockRef.current = false;
      setJoinError(extractErrorMessage(err, t('common.error')));
    },
  });

  const handleCopyCode = async (): Promise<void> => {
    if (!inviteQuery.data) return;
    await Clipboard.setStringAsync(inviteQuery.data.invite_code);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  const handleShareInvite = async (): Promise<void> => {
    if (!inviteQuery.data) return;
    await Share.share({
      message: `${inviteQuery.data.invite_code} — ${inviteQuery.data.qr_payload}`,
    });
  };

  const handleOpenScanner = async (): Promise<void> => {
    setJoinError(null);
    if (!cameraPermission?.granted) {
      const granted = await requestCameraPermission();
      if (!granted.granted) {
        setJoinError('Camera permission is required to scan a QR code.');
        return;
      }
    }
    scanLockRef.current = false;
    setScannerOpen(true);
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult): void => {
    if (scanLockRef.current || joinMutation.isPending) return;
    const parsed = parseInviteCodeFromQr(result.data);
    if (parsed.length !== 6) return;

    scanLockRef.current = true;
    setCodeInput(parsed);
    setScannerOpen(false);
    joinMutation.mutate({ invite_code: parsed });
  };

  const handleManualJoin = (): void => {
    setJoinError(null);
    const cleaned = codeInput.trim().toUpperCase();
    if (cleaned.length !== 6) {
      setJoinError('Invite code must be 6 characters.');
      return;
    }
    joinMutation.mutate({ invite_code: cleaned });
  };

  const handleSkip = (): void => {
    setHasSkippedPairing(true);
    router.replace('/(tabs)/home');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t('onboarding.pairTitle')}</Text>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabButton, activeTab === 'invite' && styles.tabActive]}
          onPress={() => setActiveTab('invite')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'invite' && styles.tabTextActive,
            ]}
          >
            {t('onboarding.myInviteTab')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === 'join' && styles.tabActive]}
          onPress={() => setActiveTab('join')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'join' && styles.tabTextActive,
            ]}
          >
            {t('onboarding.joinPartnerTab')}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'invite' ? (
        <View style={styles.card}>
          {inviteQuery.isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : inviteQuery.isError || !inviteQuery.data ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{t('common.error')}</Text>
              <Pressable
                style={styles.secondaryButton}
                onPress={() => {
                  void inviteQuery.refetch();
                }}
              >
                <Text style={styles.secondaryButtonText}>
                  {t('common.retry')}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.qrWrapper}>
                <QRCode
                  value={inviteQuery.data.qr_payload}
                  size={180}
                  color={colors.textPrimary}
                  backgroundColor={colors.white}
                />
              </View>

              <View style={styles.codeBoxes}>
                {inviteQuery.data.invite_code.split('').map((char, idx) => (
                  <View key={`${char}-${idx}`} style={styles.codeCharBox}>
                    <Text style={styles.codeChar}>{char}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.secondaryButton}
                  onPress={() => {
                    void handleCopyCode();
                  }}
                >
                  <Copy size={16} color={colors.primary} />
                  <Text style={styles.secondaryButtonText}>
                    {copiedFeedback
                      ? t('onboarding.codeCopied')
                      : t('onboarding.copyCode')}
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.primaryButtonSmall}
                  onPress={() => {
                    void handleShareInvite();
                  }}
                >
                  <Share2 size={16} color={colors.white} />
                  <Text style={styles.primaryButtonText}>
                    {t('onboarding.shareInvite')}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>{t('onboarding.enterCode')}</Text>
          <TextInput
            value={codeInput}
            onChangeText={(txt) => setCodeInput(txt.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            placeholder="A7K9P2"
            placeholderTextColor={colors.textMuted}
            style={styles.otpInput}
          />

          {joinError ? <Text style={styles.errorText}>{joinError}</Text> : null}

          <Pressable
            style={[
              styles.primaryButton,
              joinMutation.isPending && styles.disabledButton,
            ]}
            onPress={handleManualJoin}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t('onboarding.joinButton')}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.qrScanButton}
            onPress={() => {
              void handleOpenScanner();
            }}
          >
            <QrCode size={18} color={colors.secondary} />
            <Text style={styles.qrScanText}>{t('onboarding.scanQrButton')}</Text>
          </Pressable>
        </View>
      )}

      <Pressable style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>{t('onboarding.skipForNow')}</Text>
      </Pressable>

      <Modal visible={scannerOpen} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={styles.scannerOverlay}>
            <Pressable
              style={styles.closeScanner}
              onPress={() => setScannerOpen(false)}
            >
              <X size={24} color={colors.white} />
            </Pressable>
            <View style={styles.scanFrame} />
            <Text style={styles.scanPrompt}>{t('onboarding.scanQrButton')}</Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: 'center',
    gap: spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface,
  },
  tabText: {
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.lg,
    alignItems: 'center',
  },
  qrWrapper: {
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeBoxes: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  codeCharBox: {
    width: 40,
    height: 48,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
    fontFamily: 'Courier',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  primaryButtonSmall: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  label: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  otpInput: {
    width: '100%',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 8,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
  },
  qrScanButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.secondarySoft,
  },
  qrScanText: {
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 15,
  },
  errorBox: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textSecondary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  closeScanner: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing.md,
    borderRadius: radii.pill,
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: colors.primary,
    borderRadius: radii.xl,
  },
  scanPrompt: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
});
