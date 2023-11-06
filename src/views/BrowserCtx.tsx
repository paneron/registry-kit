/** @jsx jsx */

import { jsx } from '@emotion/react';
import { createContext } from 'react';
import type {
  ItemClassConfigurationSet,
  ItemClassConfiguration,
  RegisterItem,
  RegisterItemDataHook,
  Register,
  RegisterStakeholder,
  RelatedItemClassConfiguration,
  // SaveProposalHandler,
  Subregisters,
  InternalItemReference,
  RegistryViewProps,
} from '../types';
import { type Protocol } from './protocolRegistry';


// TODO(perf): split into smaller contexts
export interface BrowserCtx
extends Pick<RegistryViewProps, "defaultSearchCriteria" | "getQuickSearchPredicate" | "customViews"> {
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters

  /**
   * Stakeholder corresponding to the current user.
   * If current user is not a stakeholder, undefined.
   */
  stakeholder?: RegisterStakeholder

  /**
   * Set if no remote is configured.
   */
  offline?: true

  /**
   * Common “key expression” (used for sorting) across the register.
   * Should contain the expression itself, no “return” statement.
   */
  keyExpression?: string

  /**
   * Allows to access register metadata
   * (e.g., version, stakeholders).
   *
   * `undefined` if loading, `null` if unspecified.
   */
  registerMetadata?: Register | null

  /** Hook for getting register item data. */
  useRegisterItemData: RegisterItemDataHook

  /**
   * Invoked to navigate to an item.
   * In SPA tabbed context, could translate to `spawnTab()`;
   * in static web context, could translate to navigating browser location.
   */
  jumpTo?: (uri: `${Protocol}:${string}`) => void

  /**
   * If a register item is selected, provide its data here.
   *
   * If item data is still loading or invalid, `undefined`.
   * If item is not selected, `null`.
   */
  selectedRegisterItem?: {
    item: RegisterItem<any>
    ref: InternalItemReference
    itemClass: ItemClassConfiguration<any>
  } | null

  /**
   * Change request being drafted or reviewed.
   * `undefined` if loading, `null` if there is no active change request.
   */
  activeChangeRequestID?: string | null

  /**
   * Setter for `activeChangeRequest()`. Set to `null` to unset.
   */
  setActiveChangeRequestID?: (id: string | null) => void

  /**
   * An async function for retrieving data of register items
   * at given paths. For cases where the hook doesn’t work.
   *
   * If a path contains nothing or contains not a register item,
   * the result will be null.
   */
  // getRegisterItemData: (opts: { itemPaths: string[] }) => Promise<Record<string, RegisterItem<any> | null>>

  // onPropose?: SaveProposalHandler

  //selectedItemPath?: string

  /**
   * Given item class ID, returns a small subset of relevant class configuration data.
   */
  getRelatedItemClassConfiguration: (clsID: string) => RelatedItemClassConfiguration
  // TODO: Rename to just “get class config”
};

export const BrowserCtx = createContext<BrowserCtx>({
  itemClasses: {},
  customViews: [],
  // getRegisterItemData: async () => ({}),
  selectedRegisterItem: null,
  registerMetadata: undefined,
  useRegisterItemData: () => ({
    value: {},
    _reqCounter: -1,
    errors: [],
    isUpdating: true,
    refresh: () => void 0,
  }),
  getRelatedItemClassConfiguration: () => ({ title: 'N/A', itemView: () => <span>Loading…</span> }),
});
