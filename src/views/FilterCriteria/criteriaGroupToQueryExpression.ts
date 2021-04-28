import { CriteriaGroup, isCriteriaGroup } from './models';

/* Building query expression */


export default function criteriaGroupToQueryExpression(cg: CriteriaGroup): string {
  const exps: string[] = [];

  for (const c of cg.criteria) {
    if (isCriteriaGroup(c)) {
      exps.push(`${criteriaGroupToQueryExpression(c)}`);
    } else {
      exps.push(c.query);
    }
  }

  let result: string;
  if (exps.length < 1) {
    result = `true;`;
  } else {
    switch (cg.require) {
      case 'all':
        result = exps.join(' && ');
        break;
      case 'any':
        result = exps.join(' || ');
        break;
      case 'none':
        result = exps.map(exp => `${exp} === false`).join(' && ');
        break;
    }
  }

  return result;
}
