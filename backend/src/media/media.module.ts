import { Module } from '@nestjs/common';
import { MembersModule } from '../members/members.module';
import { MediaController } from './media.controller';

@Module({
  imports: [MembersModule],
  controllers: [MediaController],
})
export class MediaModule {}
