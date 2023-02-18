/** @jsx jsx */

import { jsx } from '@emotion/react';
import { createContext } from 'react';
import { ItemClassConfigurationSet, RegisterItemDataHook, RegisterStakeholder, RelatedItemClassConfiguration, Subregisters } from '../types';


export type BrowserCtx = {
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters

  /**
   * Stakeholder corresponding to the current user.
   * If current user is not a stakeholder, undefined.
   */
  stakeholder?: RegisterStakeholder

  /**
   * Common “key expression” (used for sorting) across the register.
   * Should contain the expression itself, no “return” statement.
   */
  keyExpression?: string

  useRegisterItemData: RegisterItemDataHook
  jumpToItem?: (classID: string, itemID: string, subregisterID?: string) => void;
  getRelatedItemClassConfiguration: (clsID: string) => RelatedItemClassConfiguration
};

export const BrowserCtx = createContext<BrowserCtx>({
  itemClasses: {},
  useRegisterItemData: () => ({
    value: {},
    _reqCounter: -1,
    errors: [],
    isUpdating: true,
    refresh: () => void 0,
  }),
  getRelatedItemClassConfiguration: () => ({ title: 'N/A', itemView: () => <span>Loading…</span> }),
});
