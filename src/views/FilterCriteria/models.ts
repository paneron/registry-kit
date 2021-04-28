import type React from 'react';
import type { ItemClassConfigurationSet, Subregisters } from '../../types';


export interface CriterionConfiguration<T extends Record<string, any>> {
  label: string;
  widget: CriteriaWidget<T>;
  toSummary: (data: T, opts: CommonOpts) => string | JSX.Element;
  toQuery: (data: T, opts: CommonOpts) => string;
  fromQuery: (query: string, opts: CommonOpts) => T;
}

export type CriteriaConfiguration = {
  [key in CriterionKey]: CriterionConfiguration<Record<string, unknown>>;
};

export const COMPOSITION_OPERATORS = [
  'all',
  'any',
  'none',
] as const;
export type CompositionOperator = typeof COMPOSITION_OPERATORS[number];

const CRITERIA_KEYS = [
  'item-class',
  'custom',
] as const;
type CriterionKey = typeof CRITERIA_KEYS[number];

export function isCriteriaKey(val: string): val is CriterionKey {
  return CRITERIA_KEYS.indexOf(val as CriterionKey) >= 0;
}

type CriteriaWidget<T extends Record<string, any>> = React.FC<{
  data: T;
  onChange?: (newData: T) => void;
  availableClassIDs: string[];
  itemClasses: ItemClassConfigurationSet;
  subregisters?: Subregisters;
  className?: string;
  style?: React.CSSProperties;
}>;

export interface Criterion {
  key: CriterionKey;
  query: string;
}

export interface CommonOpts {
  subregisters?: Subregisters;
  itemClasses: ItemClassConfigurationSet;
}

export interface CriteriaGroup {
  require: 'all' | 'any' | 'none';
  criteria: (CriteriaGroup | Criterion)[];
}

export function isCriteriaGroup(val: any): val is CriteriaGroup {
  return val.hasOwnProperty('require');
}

export function makeBlankCriteria(): CriteriaGroup {
  return { require: 'all', criteria: [] };
}
