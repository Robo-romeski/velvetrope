export type VisibilityLevel = 'public' | 'members' | 'private';

export type ProfileVisibility = {
  bio: VisibilityLevel;
  interests: VisibilityLevel;
  links: VisibilityLevel;
  avatarUrl: VisibilityLevel;
};

export const DEFAULT_PROFILE_VISIBILITY: ProfileVisibility = {
  bio: 'members',
  interests: 'members',
  links: 'members',
  avatarUrl: 'members',
};

export function canViewField(
  level: VisibilityLevel,
  context: {
    isOwner: boolean;
    viewerId: string | null;
  },
): boolean {
  if (context.isOwner) return true;
  if (level === 'private') return false;
  if (level === 'public') return true;
  // members: signed-in platform members only
  return Boolean(context.viewerId);
}
