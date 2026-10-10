import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { DirectConversationEntity } from './direct-conversation.entity';
import { DirectMessageEntity } from './direct-message.entity';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    AuthModule,
    MembersModule,
    TypeOrmModule.forFeature([DirectConversationEntity, DirectMessageEntity]),
  ],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
