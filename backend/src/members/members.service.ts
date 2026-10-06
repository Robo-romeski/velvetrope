import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../auth/user.entity';
import { MemberBlockEntity } from './member-block.entity';
import { MemberFollowEntity } from './member-follow.entity';
import {
  MemberProfileEntity,
  ProfileLink,
} from './member-profile.entity';
import {
  canViewField,
  DEFAULT_PROFILE_VISIBILITY,
  ProfileVisibility,
  VisibilityLevel,
} from './profile-visibility';
import { uniqueSlug } from './slug.util';

export type OwnProfile = {
  userId: string;
  slug: string;
  displayName: string | null;
  bio: string | null;
  interests: string[];
  links: ProfileLink[];
  avatarUrl: string | null;
  visibility: ProfileVisibility;
  followerCount: number;
  followingCount: number;
  educator: boolean;
};

export type PublicProfile = {
  userId: string;
  slug: string;
  displayName: string | null;
  bio?: string | null;
  interests?: string[];
  links?: ProfileLink[];
  avatarUrl?: string | null;
  isFollowing?: boolean;
  followerCount: number;
  followingCount: number;
};

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(MemberProfileEntity)
    private readonly profiles: Repository<MemberProfileEntity>,
    @InjectRepository(MemberBlockEntity)
    private readonly blocks: Repository<MemberBlockEntity>,
    @InjectRepository(MemberFollowEntity)
    private readonly follows: Repository<MemberFollowEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async ensureProfileForUser(userId: string, seedName?: string | null) {
    const existing = await this.profiles.findOne({ where: { userId } });
    if (existing) return existing;
    const user = await this.users.findOne({ where: { id: userId } });
    const label = seedName?.trim() || user?.name?.trim() || user?.email || userId;
    const profile = this.profiles.create({
      userId,
      slug: uniqueSlug(label),
      displayName: user?.name?.trim() || null,
      bio: null,
      interests: [],
      links: [],
      avatarUrl: null,
      visibility: MemberProfileEntity.defaultVisibility(),
      educator: false,
    });
    return await this.profiles.save(profile);
  }

  async getOwnProfile(userId: string): Promise<OwnProfile> {
    const profile = await this.ensureProfileForUser(userId);
    const [followerCount, followingCount] = await Promise.all([
      this.follows.count({ where: { followingId: userId } }),
      this.follows.count({ where: { followerId: userId } }),
    ]);
    return {
      userId: profile.userId,
      slug: profile.slug,
      displayName: profile.displayName ?? null,
      bio: profile.bio ?? null,
      interests: profile.interests ?? [],
      links: profile.links ?? [],
      avatarUrl: profile.avatarUrl ?? null,
      visibility: profile.visibility ?? DEFAULT_PROFILE_VISIBILITY,
      followerCount,
      followingCount,
      educator: profile.educator === true,
    };
  }

  async updateOwnProfile(
    userId: string,
    input: {
      displayName?: string | null;
      bio?: string | null;
      interests?: string[];
      links?: ProfileLink[];
      avatarUrl?: string | null;
      visibility?: Partial<ProfileVisibility>;
    },
  ): Promise<OwnProfile> {
    const profile = await this.ensureProfileForUser(userId);
    if (input.displayName !== undefined) {
      profile.displayName = input.displayName?.trim() || null;
    }
    if (input.bio !== undefined) {
      profile.bio = input.bio?.trim().slice(0, 4000) || null;
    }
    if (input.interests !== undefined) {
      profile.interests = this.normalizeTags(input.interests);
    }
    if (input.links !== undefined) {
      profile.links = this.normalizeLinks(input.links);
    }
    if (input.avatarUrl !== undefined) {
      profile.avatarUrl = this.normalizeUrl(input.avatarUrl);
    }
    if (input.visibility !== undefined) {
      profile.visibility = {
        ...(profile.visibility ?? DEFAULT_PROFILE_VISIBILITY),
        ...this.normalizeVisibility(input.visibility),
      };
    }
    await this.profiles.save(profile);
    return this.getOwnProfile(userId);
  }

  async resolveProfileKey(key: string): Promise<MemberProfileEntity | null> {
    const byUser = await this.profiles.findOne({ where: { userId: key } });
    if (byUser) return byUser;
    return await this.profiles.findOne({ where: { slug: key } });
  }

  async getPublicProfile(
    key: string,
    viewerId: string | null,
  ): Promise<PublicProfile> {
    const profile = await this.resolveProfileKey(key);
    if (!profile) {
      throw new NotFoundException('Member not found');
    }
    const targetId = profile.userId;
    if (viewerId && viewerId !== targetId) {
      const blocked = await this.isBlockedEitherWay(viewerId, targetId);
      if (blocked) {
        throw new NotFoundException('Member not found');
      }
    }
    const user = await this.users.findOne({ where: { id: targetId } });
    if (!user || user.accountStatus === 'suspended') {
      throw new NotFoundException('Member not found');
    }

    const visibility = profile.visibility ?? DEFAULT_PROFILE_VISIBILITY;
    const ctx = { isOwner: viewerId === targetId, viewerId };
    const displayName =
      profile.displayName?.trim() ||
      user.name?.trim() ||
      user.email.split('@')[0];

    const result: PublicProfile = {
      userId: targetId,
      slug: profile.slug,
      displayName,
      followerCount: await this.follows.count({
        where: { followingId: targetId },
      }),
      followingCount: await this.follows.count({
        where: { followerId: targetId },
      }),
    };

    if (canViewField(visibility.bio, ctx)) {
      result.bio = profile.bio ?? null;
    }
    if (canViewField(visibility.interests, ctx)) {
      result.interests = profile.interests ?? [];
    }
    if (canViewField(visibility.links, ctx)) {
      result.links = profile.links ?? [];
    }
    if (canViewField(visibility.avatarUrl, ctx)) {
      result.avatarUrl = profile.avatarUrl ?? null;
    }

    if (viewerId && viewerId !== targetId) {
      const follow = await this.follows.findOne({
        where: { followerId: viewerId, followingId: targetId },
      });
      result.isFollowing = Boolean(follow);
    }

    return result;
  }

  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new BadRequestException('You cannot block yourself');
    }
    const target = await this.users.findOne({ where: { id: blockedId } });
    if (!target) throw new NotFoundException('Member not found');
    await this.ensureProfileForUser(blockedId);
    const existing = await this.blocks.findOne({
      where: { blockerId, blockedId },
    });
    if (!existing) {
      await this.blocks.save(
        this.blocks.create({ blockerId, blockedId }),
      );
    }
    await this.follows.delete({ followerId: blockerId, followingId: blockedId });
    await this.follows.delete({ followerId: blockedId, followingId: blockerId });
    return { blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    await this.blocks.delete({ blockerId, blockedId });
    return { blocked: false };
  }

  async listBlocks(blockerId: string) {
    const rows = await this.blocks.find({
      where: { blockerId },
      order: { createdAt: 'DESC' },
    });
    const profiles = await Promise.all(
      rows.map(async (row) => {
        const profile = await this.ensureProfileForUser(row.blockedId);
        return {
          userId: row.blockedId,
          slug: profile.slug,
          displayName: profile.displayName,
          blockedAt: row.createdAt,
        };
      }),
    );
    return profiles;
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    if (await this.isBlockedEitherWay(followerId, followingId)) {
      throw new ForbiddenException('Cannot follow this member');
    }
    await this.ensureProfileForUser(followingId);
    const existing = await this.follows.findOne({
      where: { followerId, followingId },
    });
    if (!existing) {
      await this.follows.save(
        this.follows.create({ followerId, followingId }),
      );
    }
    return { following: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.follows.delete({ followerId, followingId });
    return { following: false };
  }

  async listFollowers(userId: string, viewerId: string) {
    if (userId !== viewerId) {
      throw new ForbiddenException('Followers list is private');
    }
    const rows = await this.follows.find({
      where: { followingId: userId },
      order: { createdAt: 'DESC' },
    });
    return this.mapFollowProfiles(rows.map((r) => r.followerId), viewerId);
  }

  async listFollowing(userId: string, viewerId: string) {
    if (userId !== viewerId) {
      throw new ForbiddenException('Following list is private');
    }
    const rows = await this.follows.find({
      where: { followerId: userId },
      order: { createdAt: 'DESC' },
    });
    return this.mapFollowProfiles(rows.map((r) => r.followingId), viewerId);
  }

  private async mapFollowProfiles(userIds: string[], viewerId: string) {
    const out = [];
    for (const id of userIds) {
      try {
        const profile = await this.getPublicProfile(id, viewerId);
        out.push({
          userId: profile.userId,
          slug: profile.slug,
          displayName: profile.displayName,
        });
      } catch {
        // skip blocked or missing
      }
    }
    return out;
  }

  async isBlockedEitherWay(a: string, b: string): Promise<boolean> {
    const hit = await this.blocks.findOne({
      where: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    });
    return Boolean(hit);
  }

  private normalizeTags(tags: string[]): string[] {
    const out: string[] = [];
    for (const raw of tags) {
      const tag = (raw ?? '').trim().slice(0, 48);
      if (!tag) continue;
      if (!out.includes(tag)) out.push(tag);
      if (out.length >= 24) break;
    }
    return out;
  }

  private normalizeLinks(links: ProfileLink[]): ProfileLink[] {
    const out: ProfileLink[] = [];
    for (const item of links) {
      const label = (item?.label ?? '').trim().slice(0, 80);
      const url = this.normalizeUrl(item?.url ?? null);
      if (!label || !url) continue;
      out.push({ label, url });
      if (out.length >= 8) break;
    }
    return out;
  }

  private normalizeUrl(url: string | null): string | null {
    const trimmed = (url ?? '').trim();
    if (!trimmed) return null;
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new BadRequestException('Links and avatar must use http(s) URLs');
    }
    return trimmed.slice(0, 2048);
  }

  private normalizeVisibility(
    partial: Partial<ProfileVisibility>,
  ): Partial<ProfileVisibility> {
    const out: Partial<ProfileVisibility> = {};
    const keys: (keyof ProfileVisibility)[] = [
      'bio',
      'interests',
      'links',
      'avatarUrl',
    ];
    for (const key of keys) {
      const level = partial[key];
      if (level === 'public' || level === 'members' || level === 'private') {
        out[key] = level as VisibilityLevel;
      }
    }
    return out;
  }
}
