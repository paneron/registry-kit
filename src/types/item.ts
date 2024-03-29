import type { Citation, LocalizedAlternative } from './util';


export type Payload = Record<string, any>

const ITEM_STATUSES = [
  'submitted',
  'valid',
  'superseded',
  'retired',
  'invalid',
] as const;

export type ItemStatus = typeof ITEM_STATUSES[number];


export interface RegisterItemID {
  classID: string
  itemID: string
}


export interface RegisterItemClass {
  id: string
  title: string
  description?: string
  alternativeNames?: Readonly<LocalizedAlternative<string>[]>
}

interface ItemReference {
  registerID: string
  subregisterID?: string
  classID: string
  itemID: string
}

export type InternalItemReference = Omit<ItemReference, 'registerID'>

export function isInternalItemReference(val: any): val is InternalItemReference {
  return (
    val &&
    val.hasOwnProperty('itemID') &&
    val.hasOwnProperty('classID') &&
    typeof val['itemID'] == 'string' &&
    typeof val['classID'] == 'string'
  );
}

export const DUMMY_REF: InternalItemReference = {
  itemID: 'NONEXISTENT_ITEM_ID',
  classID: 'NONEXISTENT_CLASS_ID',
  subregisterID: undefined,
} as const;


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

export interface RegisterItem<P extends Payload = Payload> {
  id: string // UUID

  status: ItemStatus

  dateAccepted: Date
  // This is a mandatory property, since until their acceptance items “live” as part of their corresponding change requests

  /**
   * UUID of change request that defined the current version.
   * (Provisional.)
   */
  amendedInCR?: string

  // TODO: Denormalized, should be validated with consistency checks
  supersededBy?: InternalItemReference[]
  supersedes?: InternalItemReference[]

  /**
   * Register item data. Domain-specific. May include additional human-readable identifiers.
   * In ISO 19135-1 was represented by “definition”.
   */
  data: P

  source?: RegisterItemSource
  // TODO: Citations were suggested to be moved to proposals, as motivating/substantiating evidence.
  // TODO: Register item, however, should have a relationship that points to the original proto-item from another register.
}

export function isRegisterItem(val: any): val is RegisterItem<any> {
  return (
    val &&
    val.hasOwnProperty('id') &&
    val.hasOwnProperty('data') &&
    typeof val.data !== 'undefined' &&
    val.hasOwnProperty('status') &&
    ITEM_STATUSES.indexOf(val.status) >= 0
  );
}
