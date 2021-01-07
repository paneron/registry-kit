import type React from 'react';
import type { ObjectDataRequest, ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { Payload, RegisterItem, RegisterItemClass } from './item';


// Extension configuration

export interface ExtensionContext {
  getRelatedItemClassConfiguration: (classID: string) => RelatedItemClassConfiguration
  useRegisterItemData: RegisterItemDataHook
  onJump?: () => void
}

export interface RegisterConfiguration<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>> {
  itemClassConfiguration: Items
}

export type Subregisters<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>> = {
  [subregisterID: string]: {
    title: string
    itemClasses: (keyof Items)[]
  }
};

export interface SearchCriteria {
  require: 'all' | 'any' | 'none'

  // A list where an item could be further nested criteria
  // or an expression that, given ``item`` as context, evaluates to true or false.
  criteria: (SearchCriteria | string)[]
}

// interface CriterionExpression<Variables extends string[]> {
//   variables: {
//     [variable in Variables[number]]: { title: string }
//   }
//   getExpression: (variableValues: Record<Variables[number], string>) => string
// }

interface SimpleSortingExpression {
  direction: 'asc' | 'desc' | 'rand'
  field: string
}

export type RegisterItemIDListHook =
  (opts: { searchCriteria?: SearchCriteria, sortBy?: SimpleSortingExpression }) => ValueHook<string[]>;

export type RegisterItemDataHook<P extends Payload = Payload> =
  (paths: ObjectDataRequest) => ValueHook<Record<string, RegisterItem<P>>>;

export type ItemClassConfigurationSet = {
  [itemClassID: string]: ItemClassConfiguration<any>
};


// interface AbstractField<T = string> {
//   type: string
//   label: string
//   viewOptions?: Record<string, any>
//   nullable?: true
//   priority?: number
// 
//   validateValue?: (val: T) => Promise<boolean>
//   sanitizeValue?: (val: T) => Promise<T>
// }
// 
// interface Relation extends AbstractField {
//   type: 'relation'
//   reverseIndex?: true
// }
// 
// interface Text extends AbstractField {
//   type: 'text'
// }
// 
// interface Number extends AbstractField {
//   type: 'number'
// }
// 
// interface DateField extends AbstractField<Date> {
//   type: 'date'
// }
// 
// type Field = Text | Number | Relation | DateField


export interface ItemClassConfiguration<P extends Payload/*, F extends Field*/> {
  meta: RegisterItemClass

  //fields?: {
  //  [fieldname in keyof P]: F
  //}

  //relations?: {
  //  [fieldname in keyof P]: {
  //    classID: string
  //    reverseIndex?: true
  //  }
  //}

  defaults?: RegistryItemPayloadDefaults<P>
  // Used to pre-populate item data e.g. when a new item is created.

  validatePayload?: (item: P) => Promise<boolean>
  sanitizePayload?: (item: P) => Promise<P>
  itemSorter?: (a: P, b: P) => number

  views: {
    listItemView: ItemListView<P>
    detailView: ItemDetailView<P>
    editView: ItemEditView<P>

    //createView?: React.FC<{
    //  defaults: RegistryItemPayloadDefaults<P>
    //  itemData: null
    //  onChange: (newData: P) => void
    //}>
  }
}


// Item views

export interface RegistryViewProps
<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>>
extends RegisterConfiguration<Items> {
  subregisters?: Subregisters<Items>
}

export type RegistryView = React.FC<RegistryViewProps>

type RegistryItemPayloadDefaults<P extends Payload> =
  Partial<Omit<P, 'id'>>;

export type RelatedItemClassConfiguration = {
  title: string
  itemView: ItemListView<any>
}


export interface RegistryItemViewProps<P extends Payload> {
  itemData: P
  className?: string
  getRelatedItemClassConfiguration: ExtensionContext["getRelatedItemClassConfiguration"]
}

export interface GenericRelatedItemViewProps {
  itemRef: { classID: string, itemID: string, subregisterID?: string }
  className?: string
  useRegisterItemData: RegisterItemDataHook
  getRelatedItemClassConfiguration: ExtensionContext["getRelatedItemClassConfiguration"]
}


export type ItemEditView<P> = React.FC<RegistryItemViewProps<P> & {
  onChange?: (newData: P) => void
}>;
export type ItemDetailView<P> = React.FC<RegistryItemViewProps<P> & {
  useRegisterItemData: RegisterItemDataHook
}>;

export type ItemListView<P> = React.FC<RegistryItemViewProps<P> & { itemID: string }>;
export type LazyItemView = React.FC<{ itemID: string }>;
