export type MessageMember = {
  userId: string;
  slug: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type ConversationSummary = {
  id: string;
  otherMember: MessageMember;
  lastMessage: {
    body: string;
    senderId: string;
    createdAt: string;
  } | null;
  lastMessageAt: string | null;
  unreadCount: number;
  canSend: boolean;
};

export type DirectMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ConversationThread = {
  conversation: ConversationSummary;
  messages: DirectMessage[];
};
