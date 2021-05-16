/** @jsx jsx */

import { jsx } from '@emotion/core';
import { createContext } from 'react';
import { ItemClassConfigurationSet, RegisterItemDataHook, RegisterStakeholder, RelatedItemClassConfiguration, Subregisters } from '../types';


export type BrowserCtx = {
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters
  stakeholder?: RegisterStakeholder // If current user is not a stakeholder, this is undefined.
  useRegisterItemData: RegisterItemDataHook
  jumpToItem?: (classID: string, itemID: string, subregisterID?: string) => void;
  getRelatedItemClassConfiguration: (clsID: string) => RelatedItemClassConfiguration
};

export const BrowserCtx = createContext<BrowserCtx>({
  itemClasses: {},
  stakeholder: undefined,
  useRegisterItemData: () => ({
    value: {},
    _reqCounter: -1,
    errors: [],
    isUpdating: true,
    refresh: () => void 0,
  }),
  getRelatedItemClassConfiguration: () => ({ title: 'N/A', itemView: () => <span>Loading…</span> })
});
