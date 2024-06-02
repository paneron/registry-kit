/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import type { OptionProps } from '@blueprintjs/core';
import { Select, TextInput } from '@riboseinc/paneron-extension-kit/widgets/Sidebar/PropertyView';
import type { CriteriaConfiguration, CriterionConfiguration } from './models';
import { SUBREGISTER_PATH_PREFIX } from './index';


export const ITEM_CLASS: CriterionConfiguration<{ classID?: string }> = {
  label: "item class is",
  icon: 'cube',
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
  widget: ({ data, onChange, itemClasses, availableClassIDs, className, style }) => {
    const itemClassChoices: OptionProps[] = [
      ...Object.entries(itemClasses).
      filter(([clsID, ]) => availableClassIDs.indexOf(clsID) >= 0).
      map(([classID, classData]) => {
        return {
          value: classID,
          label: classData?.meta?.title ?? "Unknown class",
        };
      }),
      { value: '', label: "(not selected)" },
    ];
    return (
      <Select
        className={className}
        style={style}
        fill
        options={itemClassChoices}
        value={data.classID ?? ''}
        disabled={!onChange}
        onChange={onChange
          ? (evt) => onChange!({ classID: evt.currentTarget.value })
          : undefined}
      />
    );
  },
};


export const SUBREGISTER: CriterionConfiguration<{ subregisterID?: string }> = {
  label: "is in subregister",
  icon: 'folder-open',
  isEnabled: ({ subregisters }) => subregisters !== undefined,
  toQuery: ({ subregisterID }, { subregisters }) => subregisters !== undefined && subregisterID?.trim()
    ? `objPath.indexOf("/subregisters/${subregisterID}/") === 0`
    : 'true',
  fromQuery: (query) => ({
    subregisterID: query.split('/')[2],
  }),
  toSummary: ({ subregisterID }, { subregisters }) => {
    if (subregisters && subregisterID) {
      return subregisters[subregisterID].title;
    } else {
      return "(N/A)";
    }
  },
  widget: ({ data, onChange, subregisters, className, style }) => {
    const subregisterChoices: OptionProps[] = [
      ...Object.entries(subregisters ?? {}).
        map(([subregisterID, subregisterInfo]) => {
          return { value: subregisterID, label: subregisterInfo.title };
        }),
      { value: '', label: "(not selected)" },
    ];
    return (
      <Select
        className={className}
        style={style}
        fill
        options={subregisterChoices}
        value={data.subregisterID ?? ''}
        disabled={!onChange}
        onChange={onChange
          ? (evt) => onChange!({ subregisterID: evt.currentTarget.value })
          : undefined}
      />
    );
  },
};


export const RAW_SUBSTRING: CriterionConfiguration<{ substring?: string }> = {
  label: "raw data contains",
  icon: 'search-text',
  toQuery: ({ substring }) =>
    substring?.trim()
      ? `JSON.stringify(obj.data ?? {}).toLowerCase().indexOf("${substring.toLowerCase().replace(/"/g, "\\\"")}") >= 0`
      : `true`,
  fromQuery: (query) => ({
    substring: (query.
      split('JSON.stringify(obj.data ?? {}).toLowerCase().indexOf("')[1]?.
      split('") >= 0')[0] ?? '').replace(/\\"/g, '"'),
  }),
  toSummary: ({ substring }) => {
    if (substring) {
      return substring.length > 20 ? `${substring.slice(0, 20)}…` : substring;
    } else {
      return 'N/A';
    }
  },
  widget: ({ data, onChange, className, style }) => {
    return <TextInput
      className={className}
      style={style}
      value={data.substring ?? ''}
      onChange={onChange ? substring => onChange!({ substring }) : undefined}
    />;
  },
}


export const CUSTOM_CONDITION: CriterionConfiguration<{ customExpression?: string; }> = {
  label: "condition is met",
  icon: 'code',
  toQuery: ({ customExpression }) => customExpression ?? 'true',
  fromQuery: (query) => ({
    customExpression: query,
  }),
  toSummary: () => "(custom test expr.)",
  widget: ({ data, onChange, className }) => {
    return (
      <TextInput
        className={className}
        title="If this expression returns ‘false’ for an item, that item is excluded from the list below. Expression must be written in JavaScript and can use special variables ‘obj’ and ‘objPath’."
        value={data.customExpression ?? 'true'}
        placeholder="Enter a valid query expression…"
        onChange={onChange
          ? (customExpression) => onChange!({ customExpression })
          : undefined}
      />
    );
  },
}


export const CRITERIA_CONFIGURATION: CriteriaConfiguration = {
  'item-class': ITEM_CLASS,
  'subregister': SUBREGISTER,
  'raw-substring': RAW_SUBSTRING,
  'custom': CUSTOM_CONDITION,
};


export default CRITERIA_CONFIGURATION;
