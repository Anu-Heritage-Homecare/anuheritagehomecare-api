import { randomInt } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { CLOCK, Clock } from '@shared/application/ports/clock.port';
import { ID_GENERATOR, IdGenerator } from '@shared/application/ports/id-generator.port';
import { PHOTO_STORAGE, PhotoStorage } from '@shared/application/ports/photo-storage.port';
import { NotFoundDomainException, ValidationException } from '@shared/domain/domain-exception';
import { CareAccessLevel, toCareAccessLevel } from '../../domain/care-access-level.enum';
import { CareCode } from '../../domain/care-code.entity';
import { CARE_CODE_REPOSITORY, CareCodeRepository } from '../../domain/care-code.repository';
import { CareCircleMember } from '../../domain/care-circle-member.entity';
import { CARE_CIRCLE_REPOSITORY, CareCircleRepository } from '../../domain/care-circle.repository';
import {
  MEMBER_ACCOUNT_REGISTRAR,
  MemberAccountRegistrar,
} from '../ports/member-account-registrar.port';
import {
  PROFILE_USER_DIRECTORY,
  ProfileUser,
  ProfileUserDirectory,
} from '../ports/profile-directories.port';

export interface CareCircleMemberView {
  id: string;
  name: string;
  relationship: string;
  accessLevel: string;
  photoUrl: string | null;
  isOwner: boolean;
}

export interface CareCircleView {
  members: CareCircleMemberView[];
}

export interface CareCodeView {
  code: string;
  expiresAt: string;
}

export interface RedeemCareCodeResult {
  ownerName: string;
  alreadyMember: boolean;
}

export interface CareCodePreviewResult {
  ownerName: string;
  ownerPhotoUrl: string | null;
}

export interface MemberAccessResult {
  id: string;
  relationship: string;
  accessLevel: string;
}

/** The relationship a new member holds until the owner corrects it in step three. */
const DEFAULT_MEMBER_RELATIONSHIP = 'Family Member';

/** The member's self chosen relationship, falling back to the default when blank. */
function resolveRelationship(relationship: string | undefined): string {
  const trimmed = relationship?.trim() ?? '';
  return trimmed.length === 0 ? DEFAULT_MEMBER_RELATIONSHIP : trimmed;
}
/** Unambiguous alphabet for the code tail (no 0/O/1/I). */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Builds a human readable care code such as CARE-7319-KLM2. */
function generateCareCode(): string {
  const digits = String(randomInt(1000, 10000));
  let tail = '';
  for (let i = 0; i < 4; i += 1) {
    tail += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return `CARE-${digits}-${tail}`;
}

/** Canonicalises user entered codes so spacing and case do not matter. */
export function normaliseCareCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Use case: the owner's care circle. Composes the owner themself (always full
 * access) and the accepted members, with name and avatar from identity and the
 * relationship and access level from the membership.
 */
@Injectable()
export class GetCareCircleUseCase {
  constructor(
    @Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository,
    @Inject(PROFILE_USER_DIRECTORY) private readonly users: ProfileUserDirectory,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
  ) {}

  async execute(query: { ownerId: string }): Promise<CareCircleView> {
    const [owner, members] = await Promise.all([
      this.users.findById(query.ownerId),
      this.members.listForOwner(query.ownerId),
    ]);

    const memberUsers = await this.users.findByIds(members.map((m) => m.memberUserId));
    const usersById = new Map(memberUsers.map((user) => [user.id, user]));

    const memberViews: CareCircleMemberView[] = [];
    if (owner !== null) {
      memberViews.push({
        id: owner.id,
        name: `${owner.firstName} ${owner.lastName}`.trim(),
        relationship: 'Primary Family Member',
        accessLevel: CareAccessLevel.Full,
        photoUrl: this.photoUrl(owner.photoKey),
        isOwner: true,
      });
    }
    for (const member of members) {
      const user = usersById.get(member.memberUserId) ?? null;
      memberViews.push({
        id: member.id,
        name: user === null ? 'Unknown' : `${user.firstName} ${user.lastName}`.trim(),
        relationship: member.relationship,
        accessLevel: member.accessLevel,
        photoUrl: this.photoUrl(user?.photoKey ?? null),
        isOwner: false,
      });
    }

    return { members: memberViews };
  }

  private photoUrl(photoKey: string | null): string | null {
    if (photoKey === null) {
      return null;
    }
    const url = this.photos.urlFor(photoKey);
    return url.length === 0 ? null : url;
  }
}

/**
 * Use case: fetch the owner's shareable care code, minting one if they have no
 * active, unexpired code. Reads are idempotent: repeated calls return the same
 * code until it expires or is regenerated, so the Invite screen shows one stable
 * code.
 */
@Injectable()
export class GetCareCodeUseCase {
  constructor(
    @Inject(CARE_CODE_REPOSITORY) private readonly codes: CareCodeRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: { ownerId: string }): Promise<CareCodeView> {
    const now = this.clock.now();
    const active = await this.codes.findActiveForOwner(query.ownerId);
    if (active !== null && active.isRedeemable(now)) {
      return toCodeView(active);
    }
    if (active !== null) {
      // An expired active row: retire it before issuing a fresh one.
      active.revoke();
      await this.codes.save(active);
    }
    const issued = await mintCareCode(this.codes, this.ids, query.ownerId, now);
    return toCodeView(issued);
  }
}

/** Use case: retire the owner's current code and issue a fresh one. Owner scoped. */
@Injectable()
export class RegenerateCareCodeUseCase {
  constructor(
    @Inject(CARE_CODE_REPOSITORY) private readonly codes: CareCodeRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: { ownerId: string }): Promise<CareCodeView> {
    const now = this.clock.now();
    const active = await this.codes.findActiveForOwner(command.ownerId);
    if (active !== null) {
      active.revoke();
      await this.codes.save(active);
    }
    const issued = await mintCareCode(this.codes, this.ids, command.ownerId, now);
    return toCodeView(issued);
  }
}

/**
 * Use case: redeem a care code, joining the authenticated user to the owner's
 * circle at the least privileged level. The code is a bearer credential, so no
 * email match is required; it must simply be active and unexpired. Reusable: the
 * code is not consumed. Idempotent for a user who is already a member.
 */
@Injectable()
export class RedeemCareCodeUseCase {
  constructor(
    @Inject(CARE_CODE_REPOSITORY) private readonly codes: CareCodeRepository,
    @Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository,
    @Inject(PROFILE_USER_DIRECTORY) private readonly users: ProfileUserDirectory,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: {
    userId: string;
    code: string;
    relationship?: string;
  }): Promise<RedeemCareCodeResult> {
    const now = this.clock.now();
    const found = await this.codes.findByCode(normaliseCareCode(command.code));
    if (found === null || !found.isRedeemable(now)) {
      // Same message whether unknown, expired or revoked: do not leak which.
      throw new ValidationException('That care code is not valid or has expired');
    }
    if (found.ownerId === command.userId) {
      throw new ValidationException('You cannot join your own care circle');
    }

    const owner = await this.users.findById(found.ownerId);
    const ownerName =
      owner === null ? 'your family' : `${owner.firstName} ${owner.lastName}`.trim();

    const existing = await this.members.findMembership(found.ownerId, command.userId);
    if (existing !== null) {
      return { ownerName, alreadyMember: true };
    }

    const member = CareCircleMember.create({
      id: this.ids.generate(),
      ownerId: found.ownerId,
      memberUserId: command.userId,
      relationship: resolveRelationship(command.relationship),
      accessLevel: CareAccessLevel.Limited,
      createdAt: now,
    });
    await this.members.save(member);
    return { ownerName, alreadyMember: false };
  }
}

export interface RegisterAndLinkResult {
  userId: string;
  ownerName: string;
  emailVerificationRequired: boolean;
}

/**
 * Use case: register a brand new member account and join it to a care code's
 * circle in one step, for the access code activation screen a person with no
 * account lands on. The code is validated FIRST, so an invalid code never leaves
 * an orphan account behind. The account is created unverified (an email
 * verification code is dispatched) and no token is issued: the membership sits
 * dormant until the person verifies and logs in, so attaching it before
 * verification exposes nothing. A duplicate email surfaces as ACCOUNT_EXISTS, the
 * app's cue to switch this person to the login and link flow instead.
 */
@Injectable()
export class RegisterAndLinkUseCase {
  constructor(
    @Inject(MEMBER_ACCOUNT_REGISTRAR) private readonly registrar: MemberAccountRegistrar,
    @Inject(CARE_CODE_REPOSITORY) private readonly codes: CareCodeRepository,
    @Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository,
    @Inject(PROFILE_USER_DIRECTORY) private readonly users: ProfileUserDirectory,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(command: {
    code: string;
    relationship: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    password: string;
  }): Promise<RegisterAndLinkResult> {
    const now = this.clock.now();

    // Validate the code before creating anything, so a bad code never orphans an
    // account. Same opaque message for unknown, expired or revoked.
    const found = await this.codes.findByCode(normaliseCareCode(command.code));
    if (found === null || !found.isRedeemable(now)) {
      throw new ValidationException('That care code is not valid or has expired');
    }

    // Create the member account (throws ACCOUNT_EXISTS if the email is taken).
    const { userId, emailVerificationRequired } = await this.registrar.register({
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      phone: command.phone,
      addressLine1: command.addressLine1,
      addressLine2: command.addressLine2,
      city: command.city,
      state: command.state,
      postalCode: command.postalCode,
      country: command.country,
      password: command.password,
    });

    const owner = await this.users.findById(found.ownerId);
    const ownerName =
      owner === null ? 'your family' : `${owner.firstName} ${owner.lastName}`.trim();

    // A brand new user can neither own this circle nor already be a member.
    const member = CareCircleMember.create({
      id: this.ids.generate(),
      ownerId: found.ownerId,
      memberUserId: userId,
      relationship: resolveRelationship(command.relationship),
      accessLevel: CareAccessLevel.Limited,
      createdAt: now,
    });
    await this.members.save(member);

    return { userId, ownerName, emailVerificationRequired };
  }
}

/**
 * Use case: preview the care circle behind a code BEFORE joining, so the app can
 * show a confirmation step. Public (no authentication) because the person has not
 * joined yet; the code itself is the bearer credential. Discloses only the owner's
 * display name and avatar, never membership or any health or account data, and
 * returns the same error whether the code is unknown, expired or revoked so a
 * guesser cannot probe which codes exist. Rate limiting is applied at the edge.
 */
@Injectable()
export class PreviewCareCodeUseCase {
  constructor(
    @Inject(CARE_CODE_REPOSITORY) private readonly codes: CareCodeRepository,
    @Inject(PROFILE_USER_DIRECTORY) private readonly users: ProfileUserDirectory,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(query: { code: string }): Promise<CareCodePreviewResult> {
    const now = this.clock.now();
    const found = await this.codes.findByCode(normaliseCareCode(query.code));
    if (found === null || !found.isRedeemable(now)) {
      throw new ValidationException('That care code is not valid or has expired');
    }

    const owner = await this.users.findById(found.ownerId);
    const ownerName =
      owner === null ? 'your family' : `${owner.firstName} ${owner.lastName}`.trim();
    const photoKey = owner?.photoKey ?? null;
    const url = photoKey === null || photoKey.length === 0 ? '' : this.photos.urlFor(photoKey);

    return { ownerName, ownerPhotoUrl: url.length === 0 ? null : url };
  }
}

/**
 * Use case: set a member's access level (and optionally relationship). This is
 * step three of the invite flow, where the owner chooses the joiner's permissions
 * after they land in the circle. Owner scoped.
 */
@Injectable()
export class SetCareCircleMemberAccessUseCase {
  constructor(@Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository) {}

  async execute(command: {
    ownerId: string;
    memberId: string;
    accessLevel: string;
    relationship?: string;
  }): Promise<MemberAccessResult> {
    const accessLevel = toCareAccessLevel(command.accessLevel);
    if (accessLevel === undefined) {
      throw new ValidationException('Access level must be LIMITED, VIEW_ONLY or FULL');
    }

    const member = await this.members.findById(command.memberId);
    if (member === null || member.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Care circle member not found');
    }

    member.changeAccessLevel(accessLevel);
    if (command.relationship !== undefined) {
      member.changeRelationship(command.relationship);
    }
    await this.members.save(member);

    return {
      id: member.id,
      relationship: member.relationship,
      accessLevel: member.accessLevel,
    };
  }
}

/** Use case: remove a member from the owner's care circle. Owner scoped. */
@Injectable()
export class RemoveCareCircleMemberUseCase {
  constructor(@Inject(CARE_CIRCLE_REPOSITORY) private readonly members: CareCircleRepository) {}

  async execute(command: { ownerId: string; memberId: string }): Promise<void> {
    const member = await this.members.findById(command.memberId);
    if (member === null || member.ownerId !== command.ownerId) {
      throw new NotFoundDomainException('Care circle member not found');
    }
    await this.members.delete(command.ownerId, command.memberId);
  }
}

/** Issues a fresh care code, retrying on the rare collision, and persists it. */
async function mintCareCode(
  codes: CareCodeRepository,
  ids: IdGenerator,
  ownerId: string,
  now: Date,
): Promise<CareCode> {
  let value = generateCareCode();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    if ((await codes.findByCode(value)) === null) {
      break;
    }
    value = generateCareCode();
  }
  const code = CareCode.issue({ id: ids.generate(), ownerId, code: value, now });
  await codes.save(code);
  return code;
}

function toCodeView(code: CareCode): CareCodeView {
  return { code: code.code, expiresAt: code.expiresAt.toISOString() };
}

// Re-exported for the enforcement layer to reuse the member view type.
export type { ProfileUser };
