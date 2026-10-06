import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembersService } from '../members/members.service';
import { GroupEntity, GroupPrivacy } from './group.entity';
import {
  GroupMemberRole,
  GroupMembershipEntity,
} from './group-membership.entity';
import { GroupPostEntity } from './group-post.entity';
import { PostCommentEntity } from './post-comment.entity';
import { uniqueSlug } from '../members/slug.util';

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
    private readonly members: MembersService,
  ) {}

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
    return Promise.all(
      visible.map((g) => this.toGroupSummary(g, viewerId)),
    );
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
      throw new ForbiddenException('Owners cannot leave; transfer ownership first');
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
    return Promise.all(rows.map((p) => this.toPost(p, viewerId)));
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
      }),
    );
    return this.toPost(post, authorId);
  }

  async listComments(postId: string, viewerId: string | null) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    const group = await this.groups.findOne({ where: { id: post.groupId } });
    if (!group) throw new NotFoundException('Post not found');
    await this.assertCanViewGroup(group, viewerId);
    const rows = await this.comments.find({
      where: { postId },
      order: { createdAt: 'ASC' },
      take: 200,
    });
    return Promise.all(rows.map((c) => this.toComment(c, viewerId)));
  }

  async createComment(
    postId: string,
    authorId: string,
    bodyInput: string,
  ) {
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.assertIsMember(post.groupId, authorId);
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
    const commentCount = await this.comments.count({ where: { postId: post.id } });
    return {
      id: post.id,
      groupId: post.groupId,
      title: post.title,
      body: post.body,
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
