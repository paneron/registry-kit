import { useContext } from 'react';
import { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { BrowserCtx } from '../BrowserCtx';
import { ItemClassConfiguration } from '../../types';


export default function useItemClassConfig(clsID: string):
ValueHook<ItemClassConfiguration<any> | undefined> {
  const { itemClasses } = useContext(BrowserCtx);
  const clsConfig = itemClasses[clsID];
  return {
    value: clsConfig,
    errors: [],
    refresh: () => void 0,
    isUpdating: false,
    _reqCounter: 0,
  };
}
