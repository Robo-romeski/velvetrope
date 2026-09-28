import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { AuthService, PublicUser } from '../auth/auth.service';
import { resolveCorsOrigins } from '../security/cors.config';

type AuthenticatedSocket = Socket & {
  data: {
    user?: PublicUser;
  };
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: resolveCorsOrigins(),
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private readonly server!: Namespace;

  private readonly messageWindows = new Map<string, number[]>();

  constructor(
    private readonly chat: ChatService,
    private readonly auth: AuthService,
  ) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : undefined;
    const authorization = client.handshake.headers.authorization;
    const headerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice('Bearer '.length)
      : undefined;
    const token = authToken ?? headerToken;
    if (!token) {
      client.disconnect(true);
      return;
    }
    try {
      client.data.user = await this.auth.authenticateToken(token);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    const sub = client.data.user?.id;
    if (sub) this.messageWindows.delete(sub);
  }

  @SubscribeMessage('chat:join')
  async join(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { eventId?: string },
  ) {
    const user = this.requireUser(client);
    const eventId = payload.eventId?.trim();
    if (!eventId) throw new WsException('eventId required');
    await this.chat.requireAccess(eventId, user.id);
    await client.join(this.room(eventId));
    return { eventId };
  }

  @SubscribeMessage('chat:send')
  async send(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { eventId?: string; body?: string },
  ) {
    const user = this.requireUser(client);
    this.enforceRateLimit(user.id);
    const eventId = payload.eventId?.trim();
    if (!eventId) throw new WsException('eventId required');
    const message = await this.chat.create(
      eventId,
      user.id,
      payload.body ?? '',
    );
    this.server.to(this.room(eventId)).emit('chat:message', message);
    return message;
  }

  @SubscribeMessage('chat:delete')
  async remove(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { messageId?: string },
  ) {
    const user = this.requireUser(client);
    const messageId = payload.messageId?.trim();
    if (!messageId) throw new WsException('messageId required');
    const message = await this.chat.delete(messageId, user.id);
    this.server.to(this.room(message.eventId)).emit('chat:message', message);
    return message;
  }

  private requireUser(client: AuthenticatedSocket): PublicUser {
    const user = client.data.user;
    if (!user) throw new WsException('Unauthorized');
    return user;
  }

  private enforceRateLimit(userSub: string): void {
    const now = Date.now();
    const recent = (this.messageWindows.get(userSub) ?? []).filter(
      (timestamp) => now - timestamp < 10_000,
    );
    if (recent.length >= 10) {
      throw new WsException('Message rate limit exceeded');
    }
    recent.push(now);
    this.messageWindows.set(userSub, recent);
  }

  private room(eventId: string): string {
    return `event:${eventId}`;
  }
}
