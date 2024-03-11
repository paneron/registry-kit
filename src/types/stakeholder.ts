// Stakeholders

/** Possible roles of a register stakeholder. */
export const StakeholderRole = {
  Owner: 'owner',
  ControlBody: 'control-body',
  ControlBodyReview: 'control-body-reviewer',
  Manager: 'manager',
  Submitter: 'submitter',
} as const;

export type StakeholderRoleType = typeof StakeholderRole[keyof typeof StakeholderRole];

export const STAKEHOLDER_ROLES = Object.values(StakeholderRole) as StakeholderRoleType[];

export function isStakeholderRole(val: string): val is StakeholderRoleType {
  return STAKEHOLDER_ROLES.indexOf(val as StakeholderRoleType) >= 0;
}

//export function getStakeholders(
//  allStakeholders: readonly RegisterStakeholder[],
//  gitServerUsername: string,
//): readonly RegisterStakeholder[] {
//  if (allStakeholders.length < 1) {
//    return Object.freeze([]);
//  } else {
//    const normalizedUsername = gitServerUsername.toLowerCase();
//    return Object.freeze(allStakeholders.filter(sh =>
//      sh.parties.find(p => p.gitServerUsername?.toLowerCase() === normalizedUsername)
//    ))
//  }
//}

export function canCreateCR(stakeholder: RegisterStakeholder): boolean {
  return (
    [
      StakeholderRole.Submitter,
      StakeholderRole.Manager,
      // TODO: Temporary, owners shouldn’t be capable of creating CRs normally:
      StakeholderRole.Owner,
    ].indexOf(stakeholder.role as any) >= 0 &&
    // Must have a Git server username (current limitation)
    // in order to be able to edit this proposal later.
    stakeholder.gitServerUsername?.trim() !== '');
}

export function canImportCR(stakeholder: RegisterStakeholder): boolean {
  return (
    [
      StakeholderRole.Manager,
      // TODO: Temporary, owners shouldn’t be capable of importing CRs normally:
      StakeholderRole.Owner,
    ].indexOf(stakeholder.role as any) >= 0) &&
    // Must have a Git server username (current limitation)
    // in order to be able to edit this proposal later.
    stakeholder.gitServerUsername?.trim() !== '';
}

export interface Contact {
  label: string
  value: string
  notes?: string
}

/** Register stakeholder represents an individual. */
interface _RegisterStakeholder {
  /** Stakeholder’s role wrt. the current register. */
  role: StakeholderRoleType
  name: string

  gitServerUsername?: string

  contacts: Contact[]

  affiliations: {
    [orgID: string]: StakeholderOrgAffiliation
  }
}

export interface StakeholderOrgAffiliation {
  role: 'pointOfContact' | 'member'
}

interface Owner extends _RegisterStakeholder {
  role: typeof StakeholderRole.Owner
}
export function isOwner(val: RegisterStakeholder): val is Owner {
  return val.role === StakeholderRole.Owner;
}

interface ControlBody extends _RegisterStakeholder {
  role: typeof StakeholderRole.ControlBody
}
export function isControlBody(val: RegisterStakeholder): val is ControlBody {
  return val.role === StakeholderRole.ControlBody;
}

interface Manager extends _RegisterStakeholder {
  role: typeof StakeholderRole.Manager
}
export function isManager(val: RegisterStakeholder): val is Manager {
  return val.role === StakeholderRole.Manager;
}

interface Submitter extends _RegisterStakeholder {
  role: typeof StakeholderRole.Submitter
}
export function isSubmitter(val: RegisterStakeholder): val is Submitter {
  return val.role === StakeholderRole.Submitter;
}

// Either logoURL or name or both must be present on an org here
export interface Organization {
  logoURL: string
  name: string
}

export type RegisterStakeholder = Owner | ControlBody | Manager | Submitter

export function isRegisterStakeholder(val: any): val is RegisterStakeholder {
  return (
    val &&
    val.hasOwnProperty('role') &&
    isStakeholderRole(val.role) &&
    val.hasOwnProperty('name'));
}
