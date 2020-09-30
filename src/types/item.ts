import { RegisterStakeholder } from './stakeholder';
import { LocalizedAlternative } from './util';


export type Payload = Record<string, any>

const ITEM_STATUSES = [
  'submitted',
  'valid',
  'superseded',
  'retired',
  'invalid',
] as const;

type ItemStatus = typeof ITEM_STATUSES[number];


export interface RegisterItemID {
  classID: string
  itemID: string
}


export interface RegisterItemClass {
  id: string
  title: string
  description: string
  alternativeNames: LocalizedAlternative<string>[]
}

export interface RegisterItemRevision<P extends Payload> {
  timestamp: Date
  parents: string[] // Revision IDs
  status: ItemStatus
  data: P
  changeRequestID?: string
  author: RegisterStakeholder
}

export interface RegisterItem<P extends Payload> {
  id: string // UUID
  status: string
  dateAccepted: Date
  data: P
  changeRequestID?: string
}
