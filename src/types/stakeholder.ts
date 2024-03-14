// Stakeholders

/** Possible roles of a register stakeholder. */
export const StakeholderRole = {
  Owner: 'owner',
  ControlBody: 'control-body',
  ControlBodyReview: 'control-body-reviewer',
  Manager: 'manager',
  Submitter: 'submitter',
} as const;

export const StakeholderRoleLabels: Record<StakeholderRoleType, string> = {
  owner: "Owner",
  'control-body': "Control body approver",
  'control-body-reviewer': "Control body reviewer",
  manager: "Manager",
  submitter: "Proposal submitter",
}

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
    isOwner(stakeholder) || isSubmitter(stakeholder) || isManager(stakeholder) && 
    // Must have a Git server username (current limitation)
    // in order to be able to edit this proposal later.
    stakeholder.gitServerUsername?.trim() !== '');
}

export function canImportCR(stakeholder: RegisterStakeholder): boolean {
  return (
    isManager(stakeholder) || isOwner(stakeholder) &&
    // Must have a Git server username (current limitation)
    // in order to be able to edit this proposal later.
    stakeholder.gitServerUsername?.trim() !== '');
}

export interface Contact {
  label: string
  value: string
  notes?: string
}

/** Register stakeholder represents an individual. */
export interface RegisterStakeholder {
  /** Stakeholder’s role wrt. the current register. */
  //role: StakeholderRoleType
  roles: readonly StakeholderRoleType[]

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

export function isOwner(val: RegisterStakeholder): boolean {
  return val.roles?.includes(StakeholderRole.Owner)
    || (val as any).role === StakeholderRole.Owner;
}

export function isControlBody(val: RegisterStakeholder): boolean {
  return val.roles?.includes(StakeholderRole.ControlBody)
    || (val as any).role === StakeholderRole.ControlBody;
}

export function isControlBodyReviewer(val: RegisterStakeholder): boolean {
  return val.roles?.includes(StakeholderRole.ControlBodyReview)
    || (val as any).role === StakeholderRole.ControlBodyReview;
}

export function isManager(val: RegisterStakeholder): boolean {
  return val.roles?.includes(StakeholderRole.Manager)
    || (val as any).role === StakeholderRole.Manager;
}

export function isSubmitter(val: RegisterStakeholder): boolean {
  return val.roles?.includes(StakeholderRole.Submitter)
    || (val as any).role === StakeholderRole.Submitter;
}

// Either logoURL or name or both must be present on an org here
export interface Organization {
  logoURL: string
  name: string
}

//export type RegisterStakeholder = Owner | ControlBody | Manager | Submitter

export function isRegisterStakeholder(val: any): val is RegisterStakeholder {
  return (
    val
    && val.hasOwnProperty('name')
    && (
      (val.hasOwnProperty('roles') && val.roles.every(isStakeholderRole))
      || (val.hasOwnProperty('role') && isStakeholderRole(val.role)) // TODO: obsolete
    )
  );
}
