import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import { hashPassword, verifyPassword } from './password';
import {
  createPasswordResetToken,
  hashPasswordResetToken,
  shouldExposePasswordResetToken,
} from './password-reset';
import {
  AUTH_AUDIENCE,
  AUTH_ISSUER,
  AUTH_TOKEN_TTL,
  resolveAuthSecret,
} from './auth.constants';
import { EmailService } from '../email/email.service';

export type PublicUser = {
  id: string;
  email: string;
  name: string | null;
  roles: string[];
};

export type AuthResult = {
  token: string;
  user: PublicUser;
};

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly email: EmailService,
  ) {}

  toPublic(user: UserEntity): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      roles: user.roles,
    };
  }

  async register(input: {
    email: string;
    password: string;
    name?: string;
    host?: boolean;
  }): Promise<AuthResult> {
    const email = this.normalizeEmail(input.email);
    const password = input.password ?? '';
    if (!email || !email.includes('@')) {
      throw new BadRequestException('Valid email required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const roles = input.host === false ? ['attendee'] : ['attendee', 'host'];
    const user = this.users.create({
      email,
      passwordHash: await hashPassword(password),
      name: input.name?.trim() || null,
      roles,
    });
    const saved = await this.users.save(user);
    return { token: await this.signToken(saved), user: this.toPublic(saved) };
  }

  async login(input: { email: string; password: string }): Promise<AuthResult> {
    const email = this.normalizeEmail(input.email);
    const user = await this.users.findOne({ where: { email } });
    if (
      !user ||
      !(await verifyPassword(input.password ?? '', user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return { token: await this.signToken(user), user: this.toPublic(user) };
  }

  async getById(id: string): Promise<PublicUser> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new UnauthorizedException();
    return this.toPublic(user);
  }

  async requestPasswordReset(email: string): Promise<{
    message: string;
    resetToken?: string;
  }> {
    const normalized = this.normalizeEmail(email);
    const message =
      'If an account exists for that email, password reset instructions have been sent.';

    if (!normalized) {
      return { message };
    }

    const user = await this.users.findOne({ where: { email: normalized } });
    if (!user) {
      return { message };
    }

    const { token, hash, expiresAt } = createPasswordResetToken();
    user.passwordResetTokenHash = hash;
    user.passwordResetExpiresAt = expiresAt;
    await this.users.save(user);

    try {
      await this.email.sendPasswordReset({
        to: user.email,
        resetToken: token,
      });
    } catch {
      // Do not reveal delivery failures; user can retry forgot-password.
    }

    const result: { message: string; resetToken?: string } = { message };
    if (shouldExposePasswordResetToken()) {
      result.resetToken = token;
    }
    return result;
  }

  async resetPassword(input: {
    token: string;
    password: string;
  }): Promise<{ message: string }> {
    const token = (input.token ?? '').trim();
    const password = input.password ?? '';
    if (!token) {
      throw new BadRequestException('Reset token required');
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const hash = hashPasswordResetToken(token);
    const user = await this.users.findOne({
      where: { passwordResetTokenHash: hash },
    });
    if (
      !user ||
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() <= Date.now()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    await this.users.save(user);

    return { message: 'Password updated. You can log in with your new password.' };
  }

  private normalizeEmail(email: string): string {
    return (email ?? '').trim().toLowerCase();
  }

  private async signToken(user: UserEntity): Promise<string> {
    const { SignJWT } = await import('jose');
    return await new SignJWT({
      roles: user.roles,
      email: user.email,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setIssuer(AUTH_ISSUER)
      .setAudience(AUTH_AUDIENCE)
      .setExpirationTime(AUTH_TOKEN_TTL)
      .sign(new TextEncoder().encode(resolveAuthSecret()));
  }
}
