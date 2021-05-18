/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/core';
import { HTMLSelect, OptionProps, InputGroup } from '@blueprintjs/core';
import { CriteriaConfiguration, CriterionConfiguration } from './models';
import { SUBREGISTER_PATH_PREFIX } from './index';


export const CRITERIA_CONFIGURATION: CriteriaConfiguration = {

  'item-class': {
    label: "item class is",
    icon: 'property',
    toQuery: ({ classID }, { subregisters }) => `objPath.indexOf("/${classID}/") >= ${subregisters ? SUBREGISTER_PATH_PREFIX.length - 1 : 0}`,
    fromQuery: (query) => ({
      classID: query.split('/')[1],
    }),
    toSummary: ({ classID }, { itemClasses }) => {
      if (classID) {
        return itemClasses[classID]?.meta.title ?? classID;
      } else {
        return "(N/A)";
      }
    },
    widget: ({ data, onChange, itemClasses, className, style }) => {
      const itemClassChoices: OptionProps[] = [
        ...Object.entries(itemClasses).
          map(([classID, classData]) => {
            return { value: classID, label: classData?.meta?.title ?? "Unknown class" };
          }),
        { value: '', label: "(not selected)" },
      ];
      return (
        <HTMLSelect
          className={className}
          style={style}
          fill
          options={itemClassChoices}
          value={data.classID ?? ''}
          disabled={!onChange}
          onChange={onChange
            ? (evt) => onChange!({ classID: evt.currentTarget.value })
            : undefined} />
      );
    },
  } as CriterionConfiguration<{ classID?: string; }>,

  'custom': {
    label: "condition is met",
    icon: 'code',
    toQuery: ({ customExpression }) => customExpression,
    fromQuery: (query) => ({
      customExpression: query,
    }),
    toSummary: () => "(custom test expr.)",
    widget: ({ data, onChange, className }) => {
      return (
        <InputGroup
          className={className}
          value={data.customExpression ?? 'true'}
          placeholder="Enter a valid query expression…"
          disabled={!onChange}
          fill
          onChange={onChange ? (evt) => onChange!({ customExpression: evt.currentTarget.value }) : undefined} />
      );
    },
  } as CriterionConfiguration<{ customExpression?: string; }>,

};


export default CRITERIA_CONFIGURATION;
