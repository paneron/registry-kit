import { createContext } from 'react';
import { ItemClassConfigurationSet, RegisterItemDataHook, Subregisters } from '../types';


export type BrowserCtx = {
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters
  useRegisterItemData: RegisterItemDataHook
  jumpToItem?: (classID: string, itemID: string, subregisterID?: string) => void;
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
});
