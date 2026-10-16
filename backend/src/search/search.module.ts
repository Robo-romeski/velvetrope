import { Module } from '@nestjs/common';
import { EducationModule } from '../education/education.module';
import { EventsModule } from '../events/events.module';
import { SocialModule } from '../social/social.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [SocialModule, EducationModule, EventsModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
