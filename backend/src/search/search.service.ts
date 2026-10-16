import { Injectable } from '@nestjs/common';
import { EducationService } from '../education/education.service';
import { EventsService } from '../events/events.service';
import { SocialService } from '../social/social.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly social: SocialService,
    private readonly education: EducationService,
    private readonly events: EventsService,
  ) {}

  async search(viewerId: string, query = '') {
    const needle = query.trim();
    const [{ members, groups }, learning, events] = await Promise.all([
      this.social.discover(viewerId, needle),
      this.education.listPublished({ q: needle }),
      this.events.searchPublished(needle),
    ]);
    return {
      query: needle,
      members,
      groups,
      learning: learning.slice(0, 12),
      events: events.slice(0, 12),
    };
  }
}
