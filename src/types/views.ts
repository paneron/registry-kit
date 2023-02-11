
import type React from 'react';
import type { ButtonProps, MenuItemProps } from '@blueprintjs/core';
import type { ObjectDatasetRequest, ObjectDatasetResponse, ValueHook } from '@riboseinc/paneron-extension-kit/types';
import type { InternalItemReference, Payload, RegisterItem, RegisterItemClass } from './item';
import type { CriteriaGroup } from '../views/FilterCriteria/models';


// Extension configuration

export interface ExtensionContext {
  getRelatedItemClassConfiguration: (classID: string) => RelatedItemClassConfiguration
  useRegisterItemData: RegisterItemDataHook
  onJump?: () => void
}

export interface RegisterConfiguration<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>> {
  /**
   * Configuration for all items in this register.
   * This includes items in subregisters.
   */
  itemClassConfiguration: Items

  /**
   * Default expression used to sort an item.
   * Passed to useFilteredIndex().
   */
  keyExpression?: string

  /** Subregister information. */
  subregisters?: Subregisters<Items>
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



export interface ExportFormatConfiguration<P extends Payload> {
  label: string
  exportItem: (
    itemData: RegisterItem<P>,
    opts: {
      getObjectData: (opts: ObjectDatasetRequest) => Promise<ObjectDatasetResponse>,
      getBlob: (val: string) => Promise<Uint8Array>,
    },
  ) => Promise<Uint8Array>
}


export interface ItemClassConfiguration<P extends Payload/*, F extends Field*/> {
  meta: RegisterItemClass

  itemCanBeSuperseded?: boolean
  // If false, items of this class cannot be superseded, only retired.
  // Default is true.

  defaults?: RegistryItemPayloadDefaults<P>
  // Used to pre-populate item data e.g. when a new item is created.

  validatePayload?: (item: P) => Promise<boolean>
  sanitizePayload?: (item: P) => Promise<P>

  // XXX: Confirm if obsolete and remove
  itemSorter?: (a: P, b: P) => number

  /**
   * Expression used to sort an item of this class.
   * Passed to useFilteredIndex().
   */
  keyExpression?: string

  exportFormats?: ExportFormatConfiguration<P>[]

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
  defaultSearchCriteria?: CriteriaGroup
}

export interface ItemAction {
  getButtonProps:
    (item: RegisterItem<any>, itemClass: ItemClassConfiguration<any>, subregisterID?: string) =>
      ButtonProps | MenuItemProps
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
  /** Currently selected item’s ref. */
  itemRef?: InternalItemReference

  className?: string
  useRegisterItemData: RegisterItemDataHook
  getRelatedItemClassConfiguration: ExtensionContext["getRelatedItemClassConfiguration"]
  availableClassIDs?: string[]
  availableSubregisterIDs?: string[]

  // XXX: Check if obsolete, remove if unused
  itemSorter?: ItemClassConfiguration<any>["itemSorter"]

  /** Called to auto-create an item (can’t auto-create if not provided) */
  onCreateNew?: () => Promise<InternalItemReference>

  /** Called when current item is cleared (can’t clear if not provided) */
  onClear?: () => void

  /** Called when a new item is selected (can’t change if not provided) */
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
