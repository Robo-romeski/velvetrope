import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MembersModule } from '../members/members.module';
import { MemberProfileEntity } from '../members/member-profile.entity';
import { EducationalContentEntity } from './educational-content.entity';
import { EducationController } from './education.controller';
import { EducationLessonEntity } from './education-lesson.entity';
import { EducationService } from './education.service';
import { LessonProgressEntity } from './lesson-progress.entity';
import { CommerceModule } from '../commerce/commerce.module';
import { StripeModule } from '../stripe/stripe.module';

@Module({
  imports: [
    AuthModule,
    MembersModule,
    CommerceModule,
    StripeModule,
    TypeOrmModule.forFeature([
      EducationalContentEntity,
      EducationLessonEntity,
      LessonProgressEntity,
      MemberProfileEntity,
    ]),
  ],
  controllers: [EducationController],
  providers: [EducationService],
})
export class EducationModule {}
