import { useContext } from 'react';
import { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { BrowserCtx } from '../BrowserCtx';
import { itemPathToItemRef } from '../itemPathUtils';
import { InternalItemReference } from '../../types';


export default function useItemRef(itemPath: string):
ValueHook<InternalItemReference | undefined> {
  const { subregisters } = useContext(BrowserCtx);
  try {
    const value = itemPathToItemRef(subregisters !== undefined, itemPath);
    return {
      value,
      isUpdating: false,
      refresh: () => void 0,
      _reqCounter: 0,
      errors: [],
    };
  } catch (e: any) {
    return {
      value: undefined,
      isUpdating: false,
      refresh: () => void 0,
      _reqCounter: 0,
      errors: [`${e.toString?.() ?? e}`],
    };
  }
}
