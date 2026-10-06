import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ProfileVisibility } from './profile-visibility';
import { DEFAULT_PROFILE_VISIBILITY } from './profile-visibility';

export type ProfileLink = { label: string; url: string };

@Entity({ name: 'member_profiles' })
export class MemberProfileEntity {
  @PrimaryColumn({ type: 'text' })
  userId!: string;

  @Index({ unique: true })
  @Column({ type: 'text' })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  displayName?: string | null;

  @Column({ type: 'text', nullable: true })
  bio?: string | null;

  @Column({ type: 'simple-json' })
  interests!: string[];

  @Column({ type: 'simple-json' })
  links!: ProfileLink[];

  @Column({ type: 'text', nullable: true })
  avatarUrl?: string | null;

  @Column({ type: 'simple-json' })
  visibility!: ProfileVisibility;

  @Column({ type: 'boolean', default: false })
  educator!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  static defaultVisibility(): ProfileVisibility {
    return { ...DEFAULT_PROFILE_VISIBILITY };
  }
}
