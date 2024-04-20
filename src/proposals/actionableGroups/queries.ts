import type { StakeholderRoleType } from '../../types';
import { State } from '../types';
import type { ActionableProposalGroup } from './types';


export function getActionableProposalGroupsForRole(role: StakeholderRoleType): readonly ActionableProposalGroup[] {
  return CR_QUERIES_FOR_ROLES.filter(([, roles]) => roles.has(role));
}

export function getActionableProposalGroupsForRoles(roles: readonly StakeholderRoleType[]): readonly ActionableProposalGroup[] {
  return roles.flatMap(getActionableProposalGroupsForRole);
}


const CR_QUERIES_FOR_ROLES: readonly ActionableProposalGroup[] =
[
  ['My Drafts', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderCondition = `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
      const query = `(obj.state === "${State.DRAFT}" || obj.state === "${State.RETURNED_FOR_CLARIFICATION}") && (${stakeholderCondition})`;
      return query;
    } else {
      return 'false';
    }
  }],
  ['My Rejected', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    // Rejections are actionable because they can be appealed by the submitter.
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderCondition = `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
      const query = `(obj.state === "${State.REJECTED}") && (${stakeholderCondition})`;
      return query;
    } else {
      return 'false';
    }
  }],
  ['Everyone’s Drafts or Returned', new Set(['manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
    if (stakeholder && stakeholder.gitServerUsername) {
      const stakeholderCondition = `obj.submittingStakeholderGitServerUsername !== "${stakeholder.gitServerUsername}"`;
      const query = `(obj.state === "${State.DRAFT}" || obj.state === "${State.RETURNED_FOR_CLARIFICATION}") && (${stakeholderCondition})`;
      return query;
    } else {
      return 'false';
    }
  }],
  // ['latest reviewed', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
  //   // TODO: Should filter only rejected perhaps?
  //   // Approved/accepted proposals can be shown in another (public) area.
  //   if (stakeholder && stakeholder.gitServerUsername) {
  //     const stakeholderCondition = stakeholder?.role !== 'submitter'
  //       ? 'true'
  //       : `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
  //     // Don’t show drafts in the list of pending proposals, unless it’s user’s own drafts.
  //     const query = `(obj.state === "${State.ACCEPTED} || obj.state === "${State.REJECTED} || obj.state === "${State.REJECTION_UPHELD_ON_APPEAL}"") && ${stakeholderCondition}`;
  //     return query;
  //   } else {
  //     return 'false';
  //   }
  //   // TODO: Implement limit
  // }],
  // ['latest withdrawn', new Set(['submitter', 'manager', 'control-body', 'owner']), function submitterProposals(stakeholder) {
  //   if (stakeholder && stakeholder.gitServerUsername) {
  //     const stakeholderCondition = stakeholder?.role !== 'submitter'
  //       ? 'true'
  //       : `obj.submittingStakeholderGitServerUsername === "${stakeholder.gitServerUsername}"`;
  //     // Don’t show drafts in the list of pending proposals, unless it’s user’s own drafts.
  //     const query = `(obj.state === "${State.WITHDRAWN}" || obj.state === "${State.APPEAL_WITHDRAWN}") && ${stakeholderCondition}`;
  //     return query;
  //   } else {
  //     return 'false';
  //   }
  //   // TODO: Implement limit
  // }],
  ['Pending Owner Appeal Review', new Set(['owner']), function ownerProposals() {
    return `obj.state === "${State.APPEALED}"`;
  }],
  ['Pending Control Body Review', new Set(['control-body', 'owner']), function cbProposals() {
    return `obj.state === "${State.SUBMITTED_FOR_CONTROL_BODY_REVIEW}"`;
  }],
  ['Pending Manager Review', new Set(['manager', 'control-body', 'owner']), function managerProposals() {
    return `obj.state === "${State.PROPOSED}"`;
  }],
] as const;
