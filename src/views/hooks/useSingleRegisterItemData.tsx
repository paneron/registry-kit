import { useContext } from 'react';
import { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { BrowserCtx } from '../BrowserCtx';
import { itemRefToItemPath } from '../itemPathUtils';
import { InternalItemReference, RegisterItem } from '../../types';


export default function useSingleRegisterItemData
(ref: InternalItemReference | undefined):
ValueHook<RegisterItem<any> | null> {
  const { useRegisterItemData } = useContext(BrowserCtx);
  const itemPath = ref ? itemRefToItemPath(ref) : 'NONEXISTENT_ITEM';
  const itemResponse = useRegisterItemData({ itemPaths: [itemPath] });
  const itemResponseValue: RegisterItem<any> | null =
    itemResponse.value[itemPath];

  const itemData = itemResponseValue?.data ?? null;
  const errMsg = "Item data cannot be loaded";
  return {
    value: itemData,
    errors: itemData === null
      ? [errMsg, ...itemResponse.errors]
      : itemResponse.errors,
    isUpdating: itemResponse.isUpdating,
    _reqCounter: itemResponse._reqCounter,
    refresh: itemResponse.refresh,
  };
}
