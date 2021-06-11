/** @jsx jsx */

import { jsx } from '@emotion/react';
import { createContext } from 'react';
import { ItemClassConfigurationSet, RegisterItemDataHook, RegisterStakeholder, RelatedItemClassConfiguration, Subregisters } from '../types';


export type BrowserCtx = {
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters
  stakeholder?: RegisterStakeholder // If current user is not a stakeholder, this is undefined.

  keyExpression?: string
  // Common “key expression” (used for sorting) across the register.
  // Should contain the expression itself, no “return” statement.

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
  getRelatedItemClassConfiguration: () => ({ title: 'N/A', itemView: () => <span>Loading…</span> })
});
