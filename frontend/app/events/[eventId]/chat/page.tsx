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
    return <div className="max-w-2xl mx-auto p-6 text-sm">Loading…</div>;
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
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <EventPageNav eventId={eventId} title={eventTitle} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Event chat</h1>
        <span className="text-xs text-gray-500">
          {connected ? 'Live' : 'HTTP fallback'}
        </span>
      </div>
      <p className="text-xs text-gray-500">
        Available to approved attendees from 48 hours before until 48 hours
        after the event. Hosts can moderate messages.
      </p>
      {error && <p className="text-sm">{error}</p>}
      <div className="space-y-2 max-h-[28rem] overflow-auto border rounded p-3">
        {messages.map((message) => (
          <div key={message.id} className="text-sm border-b last:border-0 pb-2">
            <div className="flex justify-between gap-2 text-xs text-gray-500">
              <span>{message.author.displayName}</span>
              <span>{new Date(message.createdAt).toLocaleString()}</span>
            </div>
            <p className={message.deleted ? 'italic text-gray-500' : ''}>
              {message.deleted ? 'Message removed by host.' : message.body}
            </p>
            {!message.deleted && message.author.id !== user.id && (
              <div className="flex gap-2 mt-1 text-xs">
                <button
                  type="button"
                  onClick={() => void report(message)}
                  className="text-red-600 underline"
                >
                  Report
                </button>
                {user.roles.includes('host') && (
                  <button
                    type="button"
                    onClick={() => void remove(message)}
                    className="text-red-600 underline"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">No messages yet.</p>
        )}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          maxLength={1000}
          placeholder="Write a message"
          className="border rounded px-3 py-2 bg-transparent flex-1"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  );
}
