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

export interface RegisterItemClass {
  id: string
  title: string
  description: string
  alternativeNames: LocalizedAlternative<string>[]
}

export interface RegisterItem<P extends Payload> {
  id: string // UUID
  classID: string // Item class ID
  revisions: {
    current: string // Revision ID
    tree: {
      [revisionID: string]: {
        timestamp: Date
        parents: string[] // Revision IDs
        status: ItemStatus
        data: P
        changeRequestID?: string
        author: RegisterStakeholder
      }
    }
  }
}
