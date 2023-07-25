import { useContext } from 'react';
import type { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { BrowserCtx } from '../BrowserCtx';
import type { CustomViewConfiguration } from '../../types';


export default function useCustomView(viewID: string):
ValueHook<CustomViewConfiguration | undefined> {
  const { customViews } = useContext(BrowserCtx);
  const view = customViews.find(v => v.id === viewID);
  return {
    value: view,
    errors: [],
    refresh: () => void 0,
    isUpdating: false,
    _reqCounter: 0,
  };
}
