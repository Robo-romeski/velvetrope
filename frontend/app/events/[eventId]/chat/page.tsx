'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';
import {
  API_BASE,
  apiDeleteAuth,
  apiGet,
  apiGetAuth,
  apiPostAuth,
  getAccessTokenClient,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import HostLoginPrompt from '@/app/components/HostLoginPrompt';
import { EventPageNav } from '@/app/components/EventPageNav';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingState,
  PageHeader,
  PageShell,
} from '@/app/components/ui';

type ChatMessage = {
  id: string;
  eventId: string;
  author: {
    id: string;
    displayName: string;
  };
  body: string | null;
  deleted: boolean;
  createdAt: string;
};

function mergeMessage(
  messages: ChatMessage[],
  incoming: ChatMessage,
): ChatMessage[] {
  const byId = new Map(messages.map((message) => [message.id, message]));
  byId.set(incoming.id, incoming);
  return [...byId.values()].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export default function EventChatPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const eventId = useMemo(() => String(params?.eventId ?? ''), [params]);
  const [eventTitle, setEventTitle] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (authLoading || !user || !eventId) return;
    let mounted = true;
    let client: Socket | null = null;
    (async () => {
      try {
        const [event, history, token] = await Promise.all([
          apiGet(`/events/${encodeURIComponent(eventId)}`),
          apiGetAuth(`/chat/event/${encodeURIComponent(eventId)}`),
          getAccessTokenClient(),
        ]);
        if (!mounted) return;
        setEventTitle(event?.title ?? null);
        setMessages(Array.isArray(history?.items) ? history.items : []);

        client = io(`${API_BASE}/chat`, {
          auth: { token },
          transports: ['websocket'],
        });
        client.on('connect', () => {
          setConnected(true);
          client?.emit('chat:join', { eventId });
        });
        client.on('disconnect', () => setConnected(false));
        client.on('connect_error', () => {
          setConnected(false);
          setError('Real-time connection unavailable; sending will use HTTP.');
        });
        client.on('chat:message', (message: ChatMessage) => {
          setMessages((current) => mergeMessage(current, message));
        });
        setSocket(client);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : 'Could not load chat');
        }
      }
    })();
    return () => {
      mounted = false;
      client?.disconnect();
    };
  }, [authLoading, eventId, user]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const messageBody = body.trim();
    if (!messageBody) return;
    setSending(true);
    setError(null);
    try {
      if (socket?.connected) {
        await new Promise<void>((resolve, reject) => {
          socket.timeout(5000).emit(
            'chat:send',
            { eventId, body: messageBody },
            (err: unknown, response: ChatMessage) => {
              if (err) {
                reject(new Error('Real-time send timed out'));
                return;
              }
              setMessages((current) => mergeMessage(current, response));
              resolve();
            },
          );
        });
      } else {
        const response = (await apiPostAuth(
          `/chat/event/${encodeURIComponent(eventId)}`,
          { body: messageBody },
        )) as ChatMessage;
        setMessages((current) => mergeMessage(current, response));
      }
      setBody('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const remove = async (message: ChatMessage) => {
    try {
      const removed = (await apiDeleteAuth(
        `/chat/messages/${encodeURIComponent(message.id)}`,
      )) as ChatMessage;
      setMessages((current) => mergeMessage(current, removed));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove message');
    }
  };

  const report = async (message: ChatMessage) => {
    try {
      await apiPostAuth('/trust/reports', {
        subjectType: 'message',
        subjectId: message.id,
        category: 'harassment',
        details: `Event chat message reported in event ${eventId}.`,
      });
      setError('Message reported to platform administrators.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not report message');
    }
  };

  if (authLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }
  if (!user) {
    return (
      <HostLoginPrompt
        title="Event chat"
        message="Log in to access approved-attendee chat."
      />
    );
  }

  return (
    <PageShell className="space-y-7">
      <EventPageNav eventId={eventId} title={eventTitle} />
      <PageHeader
        eyebrow="Approved guests"
        title="Event chat"
        description="Available from 48 hours before until 48 hours after the event. Hosts can moderate messages."
        actions={
          <Badge tone={connected ? 'success' : 'neutral'}>
            {connected ? 'Live' : 'HTTP fallback'}
          </Badge>
        }
      />
      {error && (
        <Alert tone="info" role="status">
          {error}
        </Alert>
      )}
      <Card className="max-h-[32rem] space-y-1 overflow-auto p-3 sm:p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className="rounded-xl px-3 py-3 text-sm transition-colors hover:bg-surface-subtle"
          >
            <div className="flex justify-between gap-2 text-xs text-muted">
              <span className="font-medium text-foreground">
                {message.author.displayName}
              </span>
              <span>{new Date(message.createdAt).toLocaleString()}</span>
            </div>
            <p
              className={
                message.deleted
                  ? 'mt-1 italic text-muted'
                  : 'mt-1 leading-6 text-foreground'
              }
            >
              {message.deleted ? 'Message removed by host.' : message.body}
            </p>
            {!message.deleted && message.author.id !== user.id && (
              <div className="mt-2 flex gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => void report(message)}
                  className="font-medium text-danger underline underline-offset-4"
                >
                  Report
                </button>
                {user.roles.includes('host') && (
                  <button
                    type="button"
                    onClick={() => void remove(message)}
                    className="font-medium text-danger underline underline-offset-4"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <EmptyState
            title="No messages yet"
            description="Start the conversation with your fellow guests."
          />
        )}
      </Card>
      <form onSubmit={send} className="flex gap-2">
        <Input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          placeholder="Write a message"
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={sending || !body.trim()}
        >
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </PageShell>
  );
}
