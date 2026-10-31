import * as Clipboard from 'expo-clipboard';
import { copyToClipboard } from './shareLink';

// ── Copying the share link ────────────────────────────────────────────────────
//
// Copy link puts the link on the clipboard through expo-clipboard, on the phone
// as on the web, and says whether it got there: the toast reports only that
// (MyScheduleShare.model › copyLinkFeedback). Jest runs as iOS.

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));

const setStringAsync = Clipboard.setStringAsync as jest.MockedFunction<typeof Clipboard.setStringAsync>;
const LINK = 'https://ba.example/add-friend/0123';

beforeEach(() => { setStringAsync.mockReset(); });

it('copies the link on the phone, and says it did', async () => {
  setStringAsync.mockResolvedValue(true);

  await expect(copyToClipboard(LINK)).resolves.toBe(true);
  expect(setStringAsync).toHaveBeenCalledWith(LINK);
});

it('says it did not when the clipboard refuses', async () => {
  setStringAsync.mockResolvedValue(false);

  await expect(copyToClipboard(LINK)).resolves.toBe(false);
});

it('says it did not when the clipboard fails', async () => {
  setStringAsync.mockRejectedValue(new Error('no clipboard'));

  await expect(copyToClipboard(LINK)).resolves.toBe(false);
});
