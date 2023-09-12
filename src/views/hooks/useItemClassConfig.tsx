import { useContext, useMemo } from 'react';
import { BrowserCtx } from '../BrowserCtx';
import { ItemClassConfiguration } from '../../types';


export default function useItemClassConfig(clsID: string):
ItemClassConfiguration<any> | undefined {
  const { itemClasses } = useContext(BrowserCtx);
  const clsConfig = itemClasses[clsID];
  return useMemo((() => clsConfig), [clsID, itemClasses]);
}
