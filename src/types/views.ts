import type React from 'react';
import type { ObjectDataRequest, ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { InternalItemReference, Payload, RegisterItem, RegisterItemClass } from './item';


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

export type RegisterItemDataHook<P extends Payload = Payload> =
  (paths: ObjectDataRequest) => ValueHook<Record<string, RegisterItem<P>>>;

export type ItemClassConfigurationSet = {
  [itemClassID: string]: ItemClassConfiguration<any>
};




export interface ItemClassConfiguration<P extends Payload/*, F extends Field*/> {
  meta: RegisterItemClass


  defaults?: RegistryItemPayloadDefaults<P>
  // Used to pre-populate item data e.g. when a new item is created.

  validatePayload?: (item: P) => Promise<boolean>
  sanitizePayload?: (item: P) => Promise<P>
  itemSorter?: (a: P, b: P) => number

  views: {
    listItemView: ItemListView<P>
    editView: ItemEditView<P>
    detailView?: ItemDetailView<P>
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
  useRegisterItemData: RegisterItemDataHook
  getRelatedItemClassConfiguration: ExtensionContext["getRelatedItemClassConfiguration"]
}

export interface GenericRelatedItemViewProps {
  itemRef: InternalItemReference
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
