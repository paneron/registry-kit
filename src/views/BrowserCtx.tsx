/** @jsx jsx */

import { jsx } from '@emotion/core';
import { createContext } from 'react';
import { ItemClassConfigurationSet, RegisterItemDataHook, RelatedItemClassConfiguration, Subregisters } from '../types';


export type BrowserCtx = {
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters
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
