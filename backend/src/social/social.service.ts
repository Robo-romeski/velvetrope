import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';
import { MembersService } from '../members/members.service';
import { GroupEntity, GroupPrivacy } from './group.entity';
import {
  GroupMemberRole,
  GroupMembershipEntity,
} from './group-membership.entity';
import { GroupPostEntity, PostAudience } from './group-post.entity';
import { PostCommentEntity } from './post-comment.entity';
import { uniqueSlug } from '../members/slug.util';
import { SocialActivityReadEntity } from './social-activity-read.entity';
import { EventsService } from '../events/events.service';
import { PostAppreciationEntity } from './post-appreciation.entity';
import { MAX_POST_APPRECIATIONS_PER_DAY } from './post-appreciation.constants';

@Injectable()
export class SocialService {
  constructor(
    @InjectRepository(GroupEntity)
    private readonly groups: Repository<GroupEntity>,
    @InjectRepository(GroupMembershipEntity)
    private readonly memberships: Repository<GroupMembershipEntity>,
    @InjectRepository(GroupPostEntity)
    private readonly posts: Repository<GroupPostEntity>,
    @InjectRepository(PostCommentEntity)
    private readonly comments: Repository<PostCommentEntity>,
    @InjectRepository(SocialActivityReadEntity)
    private readonly activityReads: Repository<SocialActivityReadEntity>,
    @InjectRepository(PostAppreciationEntity)
    private readonly appreciations: Repository<PostAppreciationEntity>,
    private readonly members: MembersService,
    private readonly events: EventsService,
  ) {}

  async listLinkableEvents(userId: string) {
    return await this.events.listLinkableForMember(userId);
  }

  async listGroups(viewerId: string | null) {
    const all = await this.groups.find({ order: { createdAt: 'DESC' } });
    const visible: GroupEntity[] = [];
    for (const group of all) {
      if (group.privacy === 'public') {
        visible.push(group);
        continue;
      }
      if (viewerId) {
        const member = await this.memberships.findOne({
          where: { groupId: group.id, userId: viewerId },
        });
        if (member) visible.push(group);
      }
    }
    return Promise.all(visible.map((g) => this.toGroupSummary(g, viewerId)));
  }

  async createGroup(
    ownerId: string,
    input: { name: string; description?: string; privacy?: GroupPrivacy },
  ) {
    const name = (input.name ?? '').trim();
    if (name.length < 2) {
      throw new BadRequestException('Group name is required');
    }
    const privacy: GroupPrivacy =
      input.privacy === 'private' ? 'private' : 'public';
    const slug = uniqueSlug(name);
    const group = await this.groups.save(
      this.groups.create({
        slug,
        name,
        description: input.description?.trim().slice(0, 2000) || null,
        privacy,
        ownerId,
      }),
    );
    await this.memberships.save(
      this.memberships.create({
        groupId: group.id,
        userId: ownerId,
        role: 'owner',
      }),
    );
    return this.getGroup(group.slug, ownerId);
  }

  async getGroup(key: string, viewerId: string | null) {
    const group = await this.resolveGroup(key);
    await this.assertCanViewGroup(group, viewerId);
    return this.toGroupDetail(group, viewerId);
  }

  async joinGroup(key: string, userId: string) {
    const group = await this.resolveGroup(key);
    const ownerBlocked = await this.members.isBlockedEitherWay(
      userId,
      group.ownerId,
    );
    if (ownerBlocked) {
      throw new ForbiddenException('Cannot join this group');
    }
    const existing = await this.memberships.findOne({
      where: { groupId: group.id, userId },
    });
    if (!existing) {
      await this.memberships.save(
        this.memberships.create({
          groupId: group.id,
          userId,
          role: 'member',
        }),
      );
    }
    return this.getGroup(group.slug, userId);
  }

  async leaveGroup(key: string, userId: string) {
    const group = await this.resolveGroup(key);
    const membership = await this.memberships.findOne({
      where: { groupId: group.id, userId },
    });
    if (!membership) return { left: true };
    if (membership.role === 'owner') {
      throw new ForbiddenException(
        'Owners cannot leave; transfer ownership first',
      );
    }
    await this.memberships.delete({ id: membership.id });
    return { left: true };
  }

  async listPosts(key: string, viewerId: string | null) {
    const group = await this.resolveGroup(key);
    await this.assertCanViewGroup(group, viewerId);
    const rows = await this.posts.find({
      where: { groupId: group.id },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const visible = [];
    for (const post of rows) {
      if (
        viewerId &&
        (await this.members.isBlockedEitherWay(viewerId, post.authorId))
      ) {
        continue;
      }
      visible.push(await this.toPost(post, viewerId));
    }
    return visible;
  }

  async createPost(
    key: string,
    authorId: string,
    input: { title?: string; body: string },
  ) {
    const group = await this.resolveGroup(key);
    await this.assertIsMember(group.id, authorId);
    const body = (input.body ?? '').trim();
    if (body.length < 1) {
      throw new ForbiddenException('Post body is required');
    }
    const post = await this.posts.save(
      this.posts.create({
        groupId: group.id,
        authorId,
        title: input.title?.trim().slice(0, 200) || null,
        body: body.slice(0, 20_000),
        audience: 'group',
        linkUrl: null,
      }),
    );
    return this.toPost(post, authorId);
  }

  async listComments(postId: string, viewerId: string | null) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.assertCanViewPost(post, viewerId);
    const rows = await this.comments.find({
      where: { postId },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    const visible = [];
    for (const comment of rows) {
      if (
        viewerId &&
        (await this.members.isBlockedEitherWay(viewerId, comment.authorId))
      ) {
        continue;
      }
      visible.push(await this.toComment(comment, viewerId));
    }
    return visible;
  }

  async createComment(postId: string, authorId: string, bodyInput: string) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.groupId) {
      await this.assertIsMember(post.groupId, authorId);
    } else {
      await this.assertCanViewPost(post, authorId);
    }
    const body = (bodyInput ?? '').trim();
    if (!body) throw new ForbiddenException('Comment is required');
    const comment = await this.comments.save(
      this.comments.create({
        postId,
        authorId,
        body: body.slice(0, 4000),
      }),
    );
    return this.toComment(comment, authorId);
  }

  async createMemberPost(
    authorId: string,
    input: {
      body?: string;
      linkUrl?: string | null;
      audience?: PostAudience;
      eventId?: string | null;
    },
  ) {
    await this.members.ensureProfileForUser(authorId);
    const body = (input.body ?? '').trim();
    if (!body) throw new BadRequestException('Post body is required');
    const audience: PostAudience =
      input.audience === 'followers' ? 'followers' : 'members';
    const linkUrl = this.normalizeLink(input.linkUrl);
    const eventIdRaw = (input.eventId ?? '').trim();
    let eventId: string | null = null;
    if (eventIdRaw) {
      await this.events.assertMemberCanLinkEvent(authorId, eventIdRaw);
      eventId = eventIdRaw;
    }
    const post = await this.posts.save(
      this.posts.create({
        groupId: null,
        authorId,
        title: null,
        body: body.slice(0, 20_000),
        audience,
        linkUrl,
        eventId,
      }),
    );
    const created = await this.toPost(post, authorId);
    const [enriched] = await this.withPostAppreciationMeta([created], authorId);
    return enriched ?? created;
  }

  async listFeed(
    viewerId: string,
    scope: 'following' | 'discover' = 'following',
    options?: { cursor?: string | null; limit?: number },
  ) {
    await this.members.ensureProfileForUser(viewerId);
    const limit = Math.min(Math.max(options?.limit ?? 25, 1), 50);
    const followingIds = new Set(await this.members.getFollowingIds(viewerId));
    const joinedGroupIds = new Set(
      (
        await this.memberships.find({
          where: { userId: viewerId },
          select: { groupId: true },
        })
      ).map((row) => row.groupId),
    );

    const items: Awaited<ReturnType<SocialService['toPost']>>[] = [];
    let cursor = options?.cursor?.trim() || null;
    let exhausted = false;

    while (items.length < limit && !exhausted) {
      const batch = await this.fetchFeedBatch(cursor, 80);
      if (batch.length === 0) {
        exhausted = true;
        break;
      }
      for (const post of batch) {
        cursor = this.encodeFeedCursor(post.createdAt, post.id);
        if (await this.members.isBlockedEitherWay(viewerId, post.authorId)) {
          continue;
        }
        if (!(await this.canViewPost(post, viewerId))) continue;

        if (scope === 'following') {
          const followsAuthor =
            post.authorId === viewerId || followingIds.has(post.authorId);
          const inJoinedGroup =
            post.groupId != null && joinedGroupIds.has(post.groupId);
          if (!followsAuthor && !inJoinedGroup) continue;
        }

        items.push(await this.toPost(post, viewerId));
        if (items.length >= limit) break;
      }
      if (batch.length < 80) exhausted = true;
    }

    const nextCursor =
      items.length >= limit && !exhausted
        ? this.encodeFeedCursor(
            new Date(items[items.length - 1]!.createdAt),
            items[items.length - 1]!.id,
          )
        : null;

    const enriched = await this.withPostAppreciationMeta(items, viewerId);
    return { items: enriched, nextCursor };
  }

  async togglePostAppreciation(postId: string, userId: string) {
    await this.members.ensureProfileForUser(userId);
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.assertCanViewPost(post, userId);
    if (post.authorId === userId) {
      throw new BadRequestException('You cannot appreciate your own post');
    }
    if (await this.members.isBlockedEitherWay(userId, post.authorId)) {
      throw new ForbiddenException('Cannot appreciate this post');
    }

    const existing = await this.appreciations.findOne({
      where: { postId, userId },
    });
    if (existing) {
      await this.appreciations.delete({ id: existing.id });
    } else {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const sentToday = await this.appreciations.count({
        where: { userId, createdAt: MoreThan(dayAgo) },
      });
      if (sentToday >= MAX_POST_APPRECIATIONS_PER_DAY) {
        throw new BadRequestException('Daily appreciation limit reached');
      }
      await this.appreciations.save(
        this.appreciations.create({ postId, userId }),
      );
    }

    const meta = await this.appreciationMetaForPosts([postId], userId);
    const row = meta.get(postId) ?? {
      appreciationCount: 0,
      viewerAppreciated: false,
    };
    return {
      appreciated: row.viewerAppreciated,
      appreciationCount: row.appreciationCount,
    };
  }

  async listJoinedGroups(viewerId: string) {
    await this.members.ensureProfileForUser(viewerId);
    const memberships = await this.memberships.find({
      where: { userId: viewerId },
      order: { joinedAt: 'DESC' },
      take: 50,
    });
    if (memberships.length === 0) return [];
    const groupIds = memberships.map((m) => m.groupId);
    const groups = await this.groups.find({ where: { id: In(groupIds) } });
    const byId = new Map(groups.map((g) => [g.id, g]));
    const visible = [];
    for (const membership of memberships) {
      const group = byId.get(membership.groupId);
      if (!group) continue;
      if (await this.members.isBlockedEitherWay(viewerId, group.ownerId)) {
        continue;
      }
      visible.push(await this.toGroupSummary(group, viewerId));
    }
    return visible;
  }

  private encodeFeedCursor(createdAt: Date, id: string) {
    return `${createdAt.toISOString()}|${id}`;
  }

  private parseFeedCursor(cursor: string): { createdAt: Date; id: string } | null {
    const pipe = cursor.indexOf('|');
    if (pipe <= 0) return null;
    const createdAt = new Date(cursor.slice(0, pipe));
    const id = cursor.slice(pipe + 1);
    if (Number.isNaN(createdAt.getTime()) || !id) return null;
    return { createdAt, id };
  }

  private async fetchFeedBatch(cursor: string | null, take: number) {
    const parsed = cursor ? this.parseFeedCursor(cursor) : null;
    const qb = this.posts
      .createQueryBuilder('post')
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('post.id', 'DESC')
      .take(take);
    if (parsed) {
      qb.andWhere(
        '(post.createdAt < :createdAt OR (post.createdAt = :createdAt AND post.id < :id))',
        { createdAt: parsed.createdAt, id: parsed.id },
      );
    }
    return qb.getMany();
  }

  async discover(viewerId: string, query = '') {
    const needle = query.trim().toLowerCase().slice(0, 80);
    const members = await this.members.searchMembers(viewerId, needle);
    const allGroups = await this.groups.find({
      where: { privacy: 'public' },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    const groups = [];
    for (const group of allGroups) {
      const haystack = `${group.name} ${group.description ?? ''}`.toLowerCase();
      if (needle && !haystack.includes(needle)) continue;
      if (await this.members.isBlockedEitherWay(viewerId, group.ownerId)) {
        continue;
      }
      groups.push(await this.toGroupSummary(group, viewerId));
      if (groups.length >= 12) break;
    }
    return { members, groups };
  }

  async listNotifications(userId: string) {
    const read = await this.activityReads.findOne({ where: { userId } });
    const lastReadAt = read?.lastReadAt ?? null;
    const items: Array<{
      id: string;
      type: 'follow' | 'comment';
      createdAt: Date;
      unread: boolean;
      text: string;
      href: string;
      actor: {
        userId: string;
        slug: string;
        displayName: string | null;
        avatarUrl: string | null;
      };
    }> = [];

    const followers = await this.members.listRecentFollowerActivity(userId);
    for (const row of followers) {
      items.push({
        id: `follow:${row.id}`,
        type: 'follow',
        createdAt: row.createdAt,
        unread: !lastReadAt || row.createdAt > lastReadAt,
        text: 'followed you',
        href: `/members/${row.actor.slug}`,
        actor: row.actor,
      });
    }

    const ownPosts = await this.posts.find({
      where: { authorId: userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    if (ownPosts.length > 0) {
      const postMap = new Map(ownPosts.map((post) => [post.id, post]));
      const comments = await this.comments.find({
        where: { postId: In(ownPosts.map((post) => post.id)) },
        order: { createdAt: 'DESC' },
        take: 100,
      });
      for (const comment of comments) {
        if (comment.authorId === userId) continue;
        if (await this.members.isBlockedEitherWay(userId, comment.authorId)) {
          continue;
        }
        try {
          const actor = await this.members.getPublicProfile(
            comment.authorId,
            userId,
          );
          const post = postMap.get(comment.postId);
          const group = post?.groupId
            ? await this.groups.findOne({ where: { id: post.groupId } })
            : null;
          items.push({
            id: `comment:${comment.id}`,
            type: 'comment',
            createdAt: comment.createdAt,
            unread: !lastReadAt || comment.createdAt > lastReadAt,
            text: 'commented on your post',
            href: group
              ? `/community/groups/${group.slug}?post=${comment.postId}`
              : `/community?post=${comment.postId}`,
            actor: {
              userId: actor.userId,
              slug: actor.slug,
              displayName: actor.displayName,
              avatarUrl: actor.avatarUrl ?? null,
            },
          });
        } catch {
          // Skip blocked, suspended, or missing members.
        }
      }
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const limited = items.slice(0, 50).map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));
    return {
      unreadCount: limited.filter((item) => item.unread).length,
      items: limited,
    };
  }

  async markNotificationsRead(userId: string) {
    const now = new Date();
    let row = await this.activityReads.findOne({ where: { userId } });
    if (!row) {
      row = this.activityReads.create({ userId, lastReadAt: now });
    } else {
      row.lastReadAt = now;
    }
    await this.activityReads.save(row);
    return { readAt: now.toISOString() };
  }

  async getMemberWall(key: string, viewerId: string | null) {
    const profile = await this.members.getPublicProfile(key, viewerId);
    const targetId = profile.userId;

    const rows = await this.posts.find({
      where: { authorId: targetId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const posts = [];
    for (const post of rows) {
      if (
        viewerId &&
        (await this.members.isBlockedEitherWay(viewerId, post.authorId))
      ) {
        continue;
      }
      if (!(await this.canViewPost(post, viewerId))) continue;
      posts.push(await this.toPost(post, viewerId));
      if (posts.length >= 15) break;
    }

    const memberships = await this.memberships.find({
      where: { userId: targetId },
    });
    const groups = [];
    for (const membership of memberships) {
      const group = await this.groups.findOne({
        where: { id: membership.groupId },
      });
      if (!group) continue;
      if (
        viewerId &&
        (await this.members.isBlockedEitherWay(viewerId, group.ownerId))
      ) {
        continue;
      }
      if (group.privacy === 'private') {
        if (!viewerId) continue;
        const viewerIsMember = await this.isGroupMember(group.id, viewerId);
        if (viewerId !== targetId && !viewerIsMember) continue;
      } else if (!viewerId) {
        continue;
      }
      groups.push(await this.toGroupSummary(group, viewerId));
    }
    groups.sort((a, b) => a.name.localeCompare(b.name));

    const enrichedPosts = await this.withPostAppreciationMeta(posts, viewerId);
    return { posts: enrichedPosts, groups };
  }

  private async appreciationMetaForPosts(
    postIds: string[],
    viewerId: string | null,
  ) {
    const map = new Map<
      string,
      { appreciationCount: number; viewerAppreciated: boolean }
    >();
    for (const id of postIds) {
      map.set(id, { appreciationCount: 0, viewerAppreciated: false });
    }
    if (postIds.length === 0) return map;

    const counts = await this.appreciations
      .createQueryBuilder('a')
      .select('a.postId', 'postId')
      .addSelect('COUNT(*)', 'cnt')
      .where('a.postId IN (:...postIds)', { postIds })
      .groupBy('a.postId')
      .getRawMany<{ postId: string; cnt: string }>();
    for (const row of counts) {
      map.set(row.postId, {
        appreciationCount: Number(row.cnt) || 0,
        viewerAppreciated: false,
      });
    }
    if (viewerId) {
      const mine = await this.appreciations.find({
        where: { userId: viewerId, postId: In(postIds) },
        select: { postId: true },
      });
      for (const row of mine) {
        const current = map.get(row.postId) ?? {
          appreciationCount: 0,
          viewerAppreciated: false,
        };
        map.set(row.postId, { ...current, viewerAppreciated: true });
      }
    }
    return map;
  }

  private async withPostAppreciationMeta<
    T extends { id: string },
  >(posts: T[], viewerId: string | null) {
    const meta = await this.appreciationMetaForPosts(
      posts.map((post) => post.id),
      viewerId,
    );
    return posts.map((post) => {
      const row = meta.get(post.id) ?? {
        appreciationCount: 0,
        viewerAppreciated: false,
      };
      return { ...post, ...row };
    });
  }

  private async assertCanViewPost(
    post: GroupPostEntity,
    viewerId: string | null,
  ) {
    if (post.groupId) {
      const group = await this.groups.findOne({ where: { id: post.groupId } });
      if (!group) throw new NotFoundException('Post not found');
      await this.assertCanViewGroup(group, viewerId);
      return;
    }
    if (!viewerId) {
      throw new ForbiddenException('Log in to view member posts');
    }
    if (await this.members.isBlockedEitherWay(viewerId, post.authorId)) {
      throw new NotFoundException('Post not found');
    }
    if (
      post.audience === 'followers' &&
      post.authorId !== viewerId &&
      !(await this.members.getFollowingIds(viewerId)).includes(post.authorId)
    ) {
      throw new ForbiddenException('This post is for followers');
    }
  }

  private async canViewPost(post: GroupPostEntity, viewerId: string | null) {
    try {
      await this.assertCanViewPost(post, viewerId);
      return true;
    } catch {
      return false;
    }
  }

  private async isGroupMember(groupId: string, userId: string) {
    return Boolean(
      await this.memberships.findOne({ where: { groupId, userId } }),
    );
  }

  private normalizeLink(input?: string | null): string | null {
    const link = (input ?? '').trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) {
      throw new BadRequestException('Post links must use http(s)');
    }
    return link.slice(0, 2048);
  }

  private async resolveGroup(key: string): Promise<GroupEntity> {
    const byId = await this.groups.findOne({ where: { id: key } });
    if (byId) return byId;
    const bySlug = await this.groups.findOne({ where: { slug: key } });
    if (bySlug) return bySlug;
    throw new NotFoundException('Group not found');
  }

  private async assertCanViewGroup(
    group: GroupEntity,
    viewerId: string | null,
  ) {
    if (group.privacy === 'public') {
      if (!viewerId) {
        throw new ForbiddenException('Log in to view community groups');
      }
      return;
    }
    if (!viewerId) {
      throw new ForbiddenException('Log in to view this group');
    }
    await this.assertIsMember(group.id, viewerId);
  }

  private async assertIsMember(groupId: string, userId: string) {
    const membership = await this.memberships.findOne({
      where: { groupId, userId },
    });
    if (!membership) {
      throw new ForbiddenException('Join this group to participate');
    }
  }

  private async toGroupSummary(group: GroupEntity, viewerId: string | null) {
    const memberCount = await this.memberships.count({
      where: { groupId: group.id },
    });
    let membershipRole: GroupMemberRole | null = null;
    if (viewerId) {
      const m = await this.memberships.findOne({
        where: { groupId: group.id, userId: viewerId },
      });
      membershipRole = m?.role ?? null;
    }
    return {
      id: group.id,
      slug: group.slug,
      name: group.name,
      description: group.description,
      privacy: group.privacy,
      memberCount,
      isMember: Boolean(membershipRole),
      membershipRole,
    };
  }

  private async toGroupDetail(group: GroupEntity, viewerId: string | null) {
    const summary = await this.toGroupSummary(group, viewerId);
    return {
      ...summary,
      ownerId: group.ownerId,
      createdAt: group.createdAt,
    };
  }

  private async toPost(post: GroupPostEntity, viewerId: string | null) {
    const authorProfile = viewerId
      ? await this.members.getPublicProfile(post.authorId, viewerId)
      : null;
    const commentCount = await this.comments.count({
      where: { postId: post.id },
    });
    const group = post.groupId
      ? await this.groups.findOne({ where: { id: post.groupId } })
      : null;
    const linkedEvent = post.eventId
      ? await this.events.resolveLinkedEventForViewer(
          post.eventId,
          viewerId,
          post.authorId,
        )
      : null;
    return {
      id: post.id,
      groupId: post.groupId,
      title: post.title,
      body: post.body,
      audience: post.audience ?? 'group',
      linkUrl: post.linkUrl ?? null,
      linkedEvent,
      createdAt: post.createdAt,
      author: authorProfile
        ? {
            userId: authorProfile.userId,
            slug: authorProfile.slug,
            displayName: authorProfile.displayName,
            avatarUrl: authorProfile.avatarUrl ?? null,
          }
        : { userId: post.authorId, slug: post.authorId, displayName: 'Member' },
      commentCount,
      group: group
        ? {
            slug: group.slug,
            name: group.name,
            isMember: viewerId
              ? await this.isGroupMember(group.id, viewerId)
              : false,
          }
        : null,
    };
  }

  private async toComment(comment: PostCommentEntity, viewerId: string | null) {
    let author: { userId: string; slug: string; displayName: string | null };
    try {
      const profile = await this.members.getPublicProfile(
        comment.authorId,
        viewerId,
      );
      author = {
        userId: profile.userId,
        slug: profile.slug,
        displayName: profile.displayName,
      };
    } catch {
      author = {
        userId: comment.authorId,
        slug: comment.authorId,
        displayName: 'Member',
      };
    }
    return {
      id: comment.id,
      postId: comment.postId,
      body: comment.body,
      createdAt: comment.createdAt,
      author,
    };
  }
}
