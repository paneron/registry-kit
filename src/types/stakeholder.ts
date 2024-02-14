// Stakeholders

/** Possible roles of a register stakeholder. */
export const StakeholderRole = {
  Owner: 'owner',
  ControlBody: 'control-body',
  Manager: 'manager',
  Submitter: 'submitter',
} as const;

export type StakeholderRoleType = typeof StakeholderRole[keyof typeof StakeholderRole];

export const STAKEHOLDER_ROLES = Object.values(StakeholderRole) as StakeholderRoleType[];

export function isStakeholderRole(val: string): val is StakeholderRoleType {
  return STAKEHOLDER_ROLES.indexOf(val as StakeholderRoleType) >= 0;
}

export function getStakeholders(
  allStakeholders: readonly RegisterStakeholder[],
  gitServerUsername: string,
): readonly RegisterStakeholder[] {
  if (allStakeholders.length < 1) {
    return Object.freeze([]);
  } else {
    const normalizedUsername = gitServerUsername.toLowerCase();
    return Object.freeze(allStakeholders.filter(sh =>
      sh.parties.find(p => p.gitServerUsername?.toLowerCase() === normalizedUsername)
    ))
  }
}

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

/** “Abstract” register stakeholder type. */
interface _RegisterStakeholder {
  role: StakeholderRoleType
  name: string

  // TODO: Make git server username per-party, instead of stakeholder-global?
  gitServerUsername?: string

  parties: Party[]
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

//interface NonEditingStakeholder extends _RegisterStakeholder {
//  role: 'owner'
//}
//export interface EditingStakeholder extends _RegisterStakeholder {
//  role: 'manager' | 'submitter'
//}

interface Role {
  positionName: string
  name?: never
  organization: Organization
}

interface Individual {
  name: string
  positionName?: never
  organization?: Organization
}

// Either logoURL or name or both must be present on an org here
type Organization<T = {
  logoURL: string[];
  name: string;
}> = Partial<T> & Pick<T, keyof T>

type Party = (Individual | Role | Organization) & {
  contacts: { label: string, value: string, notes?: string }[]
}

export function isIndividualParty(val: any): val is Individual {
  return typeof val.name === 'string' && !val.hasOwnProperty('positionName');
}

export type RegisterStakeholder = Owner | ControlBody | Manager | Submitter

export function isRegisterStakeholder(val: any): val is RegisterStakeholder {
  return (
    val &&
    val.hasOwnProperty('role') &&
    isStakeholderRole(val.role) &&
    val.hasOwnProperty('name'));
}
