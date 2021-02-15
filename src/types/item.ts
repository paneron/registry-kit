import { RegisterStakeholder } from './stakeholder';
import { Citation, LocalizedAlternative } from './util';


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
  description?: string
  alternativeNames?: LocalizedAlternative<string>[]
}

export interface RegisterItemRevision<P extends Payload> {
  timestamp: Date
  parents: string[] // Revision IDs
  status: ItemStatus
  data: P
  author: RegisterStakeholder
}

interface ItemReference {
  registerID: string
  subregisterID?: string
  classID: string
  itemID: string
}

export type InternalItemReference = Omit<ItemReference, 'registerID'>


interface AbstractItemSource {
  type: string
}
interface PaneronRegisterItemSource extends AbstractItemSource {
  type: 'paneron_register'
  itemRef: ItemReference
}
interface ExternalSource extends AbstractItemSource {
  type: 'external'
  citation: Citation
}
type RegisterItemSource = PaneronRegisterItemSource | ExternalSource

export interface RegisterItem<P extends Payload> {
  id: string // UUID
  status: string
  dateAccepted: Date
  data: P // Register item data, may include additional human identifiers
  source?: RegisterItemSource
}
