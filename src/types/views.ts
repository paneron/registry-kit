
import type React from 'react';
import type { ButtonProps, MenuItemProps } from '@blueprintjs/core';
import type { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import type { InternalItemReference, Payload, RegisterItem, RegisterItemClass } from './item';


// Extension configuration

export interface ExtensionContext {
  getRelatedItemClassConfiguration: (classID: string) => RelatedItemClassConfiguration
  useRegisterItemData: RegisterItemDataHook
  onJump?: () => void
}

export interface RegisterConfiguration<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>> {
  itemClassConfiguration: Items
  keyExpression?: string
}

export type Subregisters<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>> = {
  [subregisterID: string]: {
    title: string
    itemClasses: (keyof Items)[]
  }
};

export type RegisterItemDataHook<P extends Payload = Payload> =
  (opts: { itemPaths: string[] }) => ValueHook<Record<string, RegisterItem<P> | null>>;

export type ItemClassConfigurationSet = {
  [itemClassID: string]: ItemClassConfiguration<any>
};




export interface ItemClassConfiguration<P extends Payload/*, F extends Field*/> {
  meta: RegisterItemClass

  itemCanBeSuperseded?: boolean
  // If false, items of this class cannot be superseded, only retired.
  // Default is true.

  defaults?: RegistryItemPayloadDefaults<P>
  // Used to pre-populate item data e.g. when a new item is created.

  validatePayload?: (item: P) => Promise<boolean>
  sanitizePayload?: (item: P) => Promise<P>
  itemSorter?: (a: P, b: P) => number
  keyExpression?: string

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

export interface ItemAction {
  getButtonProps: (item: RegisterItem<any>, itemClass: ItemClassConfiguration<any>, subregisterID?: string) => ButtonProps | MenuItemProps
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
  subregisterID?: string
  useRegisterItemData: RegisterItemDataHook
  getRelatedItemClassConfiguration: ExtensionContext["getRelatedItemClassConfiguration"]
}

export interface GenericRelatedItemViewProps {
  itemRef?: InternalItemReference
  className?: string
  useRegisterItemData: RegisterItemDataHook
  getRelatedItemClassConfiguration: ExtensionContext["getRelatedItemClassConfiguration"]
  availableClassIDs?: string[]
  availableSubregisterIDs?: string[]
  itemSorter?: ItemClassConfiguration<any>["itemSorter"]
  onCreateNew?: () => Promise<InternalItemReference>
  onClear?: () => void
  onChange?: (newRef: InternalItemReference) => void
}


export type ItemEditView<P> = React.FC<RegistryItemViewProps<P> & {
  onChange?: (newData: P) => void
  onCreateRelatedItem?: (classID: string, subregisterID?: string) => Promise<InternalItemReference>
}>;

export interface ItemDetailViewProps<P> extends RegistryItemViewProps<P> {
  useRegisterItemData: RegisterItemDataHook
}

export type ItemDetailView<P> = React.FC<ItemDetailViewProps<P>>;

export interface ItemListViewProps<P> extends RegistryItemViewProps<P> {
  itemID: string
}
export type ItemListView<P> = React.FC<ItemListViewProps<P>>;
export type LazyItemView = React.FC<{ itemID: string }>;
