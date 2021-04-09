import { createContext } from 'react';


export type BrowserCtx = { jumpToItem?: (classID: string, itemID: string, subregisterID?: string) => void; };
export const BrowserCtx = createContext<BrowserCtx>({});
