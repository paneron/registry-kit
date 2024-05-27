import { type CriteriaGroup, isCriteriaGroup } from './models';


/**
 * Given a CriteriaGroup,
 * returns a query expression suitable for use with filtered object indexes..
 */
export default function criteriaGroupToQueryExpression(cg: CriteriaGroup): string {
  const exps: string[] = [];

  for (const c of cg.criteria) {
    if (isCriteriaGroup(c)) {
      if (c.criteria.length > 1) {
        exps.push(`(${criteriaGroupToQueryExpression(c)})`);
      } else if (c.criteria.length > 0) {
        exps.push(`${criteriaGroupToQueryExpression(c)}`);
      }
    } else {
      if (c.query.trim() !== '') {
        exps.push(c.query.trim());
      } else {
        console.warn("Empty query when processing criteria group", c);
      }
    }
  }

  let result: string;
  if (exps.length < 1) {
    result = 'true';
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
