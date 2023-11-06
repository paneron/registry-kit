import type React from 'react';
import type { IconName } from '@blueprintjs/core';
import type { ItemClassConfigurationSet, Subregisters } from '../../types';


/**
 * Defines how to display a search criterion.
 * T: criteria data structure.
 */
export interface CriterionConfiguration<T extends Record<string, any>> {
  icon?: IconName
  label: string;

  /**
   * Widget that displays and optionally allows editing
   * criteria data structure.
   */
  widget: CriteriaWidget<T>;

  /**
   * Determines whether to enable this search criteria based on 
   * registry configuration.
   */
  isEnabled?: (opts: CommonOpts) => boolean

  /** Summarizes criteria in a human-readable way. */
  toSummary: (data: T, opts: CommonOpts) => string | JSX.Element;

  /**
   * Coverts criteria structure to a string
   * that can be passed to filtering backend.
   */
  toQuery: (data: T, opts: CommonOpts) => string;

  /** Converts a query string to criteria structure. */
  fromQuery: (query: string, opts: CommonOpts) => T;
}

export type CriteriaConfiguration = {
  [key in CriterionKey]: CriterionConfiguration<Record<string, unknown>>;
};

export type CriteriaTransformer = (existing: CriteriaGroup) => CriteriaGroup;

export const COMPOSITION_OPERATORS = [
  'all',
  'any',
  'none',
] as const;
export type CompositionOperator = typeof COMPOSITION_OPERATORS[number];

// TODO: Can we not hard-code keys here? Would require some smart generic typing.
const CRITERIA_KEYS = [
  'item-class',
  'subregister',
  'custom',
  'raw-substring',
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
  /** Specific criterion as a string. */
  query: string;

  /** Key in criteria configuration that defines how to work with this criterion. */
  key: CriterionKey;
}

/** Register metadata that may be needed to display filter criteria. */
export interface CommonOpts {
  subregisters?: Subregisters;
  itemClasses: ItemClassConfigurationSet;
}

export interface CriteriaGroup {
  require: 'all' | 'any' | 'none';
  criteria: (CriteriaGroup | Criterion)[];
}

export function isCriteriaGroup(val: any): val is CriteriaGroup {
  return val && val.hasOwnProperty('require') && val.hasOwnProperty('criteria');
}

// TODO: Deprecate in favour of `BLANK_CRITERIA`?
export function makeBlankCriteria(): CriteriaGroup {
  return BLANK_CRITERIA;
}

/** Useful as no-op default where a valid criteria is required. */
export const BLANK_CRITERIA: CriteriaGroup = {
  require: 'all',
  criteria: [],
};
