import { useContext, useMemo } from 'react';
import type { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { BrowserCtx } from '../BrowserCtx';
import { itemRefToItemPath } from '../itemPathUtils';
import type { InternalItemReference, RegisterItem } from '../../types';


const errMsg = "Item data cannot be loaded";


export default function useSingleRegisterItemData
(ref: InternalItemReference | undefined | null):
ValueHook<RegisterItem<any> | null> {
  const { useRegisterItemData } = useContext(BrowserCtx);
  const itemPath = ref ? itemRefToItemPath(ref) : 'NONEXISTENT_ITEM';
  const itemResponse = useRegisterItemData({ itemPaths: [itemPath] });
  const itemResponseValue: RegisterItem<any> | null =
    itemResponse.value[itemPath];

  const itemData = itemResponseValue?.data ?? null;

  return useMemo((() => ({
    value: itemData,
    errors: itemData === null
      ? [errMsg, ...itemResponse.errors]
      : itemResponse.errors,
    isUpdating: itemResponse.isUpdating,
    _reqCounter: itemResponse._reqCounter,
    refresh: itemResponse.refresh,
  })), [itemResponse.isUpdating, itemResponse.refresh, itemData, JSON.stringify(ref)]);
}
