import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatMessageEntity } from './chat-message.entity';
import { ChatService } from './chat.service';
import { UserEntity } from '../auth/user.entity';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessageEntity, UserEntity]),
    AuthModule,
    EventsModule,
    ApplicationsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway],
})
export class ChatModule {}
