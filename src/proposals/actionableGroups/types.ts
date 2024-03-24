import type { RegisterStakeholder, StakeholderRoleType } from '../../types';


export type ActionableProposalGroup = readonly [
  label: string,
  roles: Set<StakeholderRoleType>,
  queryGetter: (stakeholder?: RegisterStakeholder) => string,
];
