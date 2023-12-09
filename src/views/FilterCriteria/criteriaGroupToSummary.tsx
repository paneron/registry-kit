/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { type ReactNode, type ReactNodeArray } from 'react';
import { type CriteriaGroup, type CommonOpts, isCriteriaGroup } from './models';
import { CRITERIA_CONFIGURATION } from "./CRITERIA_CONFIGURATION";

/* Building query summary */


export default function criteriaGroupToSummary(cg: CriteriaGroup, opts: CommonOpts): JSX.Element {
  const exps: JSX.Element[] = [];

  for (const c of cg.criteria) {
    if (isCriteriaGroup(c)) {
      exps.push(criteriaGroupToSummary(c, opts));
    } else {
      const cfg = CRITERIA_CONFIGURATION[c.key];
      if (!cfg) {
        console.error("Missing criterion configuration for key", c.key);
        throw new Error("Missing criterion configuration");
      }
      exps.push(<>{cfg.label} <em>{cfg.toSummary(cfg.fromQuery(c.query, opts), opts)}</em></>);
    }
  }

  let result: JSX.Element;
  if (exps.length < 1) {
    result = <>(no criteria)</>;
  } else {
    switch (cg.require) {
      case 'all':
        result = <>{exps.reduce((acc: ReactNodeArray, current: ReactNode, index: number) => [...acc, index ? ', ' : '', current], [])}</>;
        break;
      case 'any':
        result = <>{exps.reduce((acc: ReactNodeArray, current: ReactNode, index: number) => [...acc, index ? ' or ' : '', current], [])}</>;
        break;
      case 'none':
        result = <>neither {exps.reduce((acc: ReactNodeArray, current: ReactNode, index: number) => [...acc, index ? ' nor ' : '', current], [])}</>;
        break;
    }
  }

  return result;
}
