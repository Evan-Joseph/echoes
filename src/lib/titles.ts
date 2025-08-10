import type { AppCheckIn, AppUser } from './types';

const AI_USER_ID = 'echo-ai-assistant';

/**
 * Determines the user's title based on their activity.
 * @param user - The user's profile object.
 * @param checkIns - An array of the user's check-ins.
 * @returns The user's calculated title as a string.
 */
export function getUserTitle(
  user: AppUser | null,
  checkIns: AppCheckIn[]
): string {
  if (!user) {
    return '访客';
  }

  if (user.id === AI_USER_ID) {
    return '回响';
  }

  const checkInCount = checkIns.length;
  const hasPublicPost = checkIns.some((c) => c.isPublic);

  if (checkInCount >= 30) {
    return '思想家';
  }

  if (hasPublicPost) {
    return '分享家';
  }

  if (checkInCount >= 10) {
    return '记录家';
  }

  if (checkInCount >= 1) {
    return '探索者';
  }

  return '新手';
}
