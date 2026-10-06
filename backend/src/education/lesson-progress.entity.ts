import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'lesson_progress' })
@Index(['userId', 'lessonId'], { unique: true })
export class LessonProgressEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  userId!: string;

  @Column({ type: 'text' })
  contentId!: string;

  @Column({ type: 'text' })
  lessonId!: string;

  @CreateDateColumn()
  completedAt!: Date;
}
