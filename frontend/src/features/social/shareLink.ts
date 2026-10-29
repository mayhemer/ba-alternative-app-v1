import { Platform, Share } from 'react-native';

export type ShareResult = 'shared' | 'copied' | 'dismissed';

// Opens the native share sheet on device. On web, uses the Web Share API when
// available, otherwise falls back to copying the link to the clipboard.
export async function shareLink(url: string, message?: string): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share !== undefined) {
      try {
        await nav.share({ url, text: message });
        return 'shared';
      } catch {
        return 'dismissed';
      }
    }
    if (nav?.clipboard !== undefined) {
      await nav.clipboard.writeText(url);
      return 'copied';
    }
    return 'dismissed';
  }

  const result = await Share.share(
    message !== undefined ? { message: `${message} ${url}`, url } : { message: url, url },
  );
  return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
}

// Copies text to the clipboard where supported (web). Returns true on success.
export async function copyToClipboard(text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.clipboard !== undefined) {
      await nav.clipboard.writeText(text);
      return true;
    }
  }
  return false;
}
