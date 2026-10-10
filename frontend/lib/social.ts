export type SocialMember = {
  userId: string;
  slug: string;
  displayName: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  interests?: string[];
  isFollowing?: boolean;
};

export type SocialPost = {
  id: string;
  groupId: string | null;
  title?: string | null;
  body: string;
  audience: 'group' | 'members' | 'followers';
  linkUrl: string | null;
  createdAt: string;
  author: SocialMember;
  commentCount: number;
  group: { slug: string; name: string; isMember: boolean } | null;
};

export type SocialComment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  author: SocialMember;
};

export type GroupSummary = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  privacy: 'public' | 'private';
  memberCount: number;
  isMember: boolean;
};

export type SocialDiscovery = {
  members: SocialMember[];
  groups: GroupSummary[];
};

export type SocialNotification = {
  id: string;
  type: 'follow' | 'comment';
  createdAt: string;
  unread: boolean;
  text: string;
  href: string;
  actor: SocialMember;
};

export type SocialNotifications = {
  unreadCount: number;
  items: SocialNotification[];
};

export type MemberWall = {
  posts: SocialPost[];
  groups: GroupSummary[];
};

export type SocialFeedPage = {
  items: SocialPost[];
  nextCursor: string | null;
};
