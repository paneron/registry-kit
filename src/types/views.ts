import type React from 'react';
import type { ButtonProps, MenuItemProps } from '@blueprintjs/core';
import type { ObjectDatasetRequest, ObjectDatasetResponse, ValueHook } from '@riboseinc/paneron-extension-kit/types';
import type { InternalItemReference, Payload, RegisterItem, RegisterItemClass } from './item';
import type { CriteriaGroup } from '../views/FilterCriteria/models';


// Hooks

/**
 * Mostly a wrapper around useObjectData, but coerces value type
 * (TODO: validate!) and takes into account change request from any
 * wrapping change request context. If a change request is present,
 * will substitute proposed item data unless `ignoreActiveCR` is set.
 *
 * NOTE: Despite the name, returns the entire RegisterItem,
 * not just the `.data` property with item payload.
 */
export type RegisterItemDataHook<P extends Payload = Payload> =
  (opts: { itemPaths: string[], ignoreActiveCR?: true }) => ValueHook<Record<string, RegisterItem<P> | null>>;


// Extension configuration

// TODO: Obsolete?
// export interface ExtensionContext {
//   getRelatedItemClassConfiguration: (classID: string) => RelatedItemClassConfiguration
//   useRegisterItemData: RegisterItemDataHook
//   onJump?: () => void
// }

export interface RegisterConfiguration
<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>> {
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

export type Subregisters
<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>> = {
  [subregisterID: string]: {
    title: string

    /** Names of item classes that go in this subregister. */
    itemClasses: (keyof Items)[]
  }
};

export type ItemClassConfigurationSet = {
  [itemClassID: string]: ItemClassConfiguration<any>
};



export interface ExportFormatConfiguration<P extends Payload> {
  /** The name of the export format. */
  label: string

  /**
   * Trailing part of the filename to save export as;
   * must include at least extension (with separator),
   * must not include any path prefix.
   */
  filenameExtension: string

  /**
   * The function that takes register item data and some helper functions
   * and is expected to return a blob.
   */
  exportItem: (
    itemData: RegisterItem<P>,
    opts: {
      getObjectData: (opts: ObjectDatasetRequest) => Promise<ObjectDatasetResponse>,
      getBlob: (val: string) => Promise<Uint8Array>,
      logger?: { log: Console["log"], error: Console["error"], debug: Console["debug"] },
    },
  ) => Promise<Uint8Array>
}


export interface ItemClassConfiguration<P extends Payload/*, F extends Field*/> {
  meta: RegisterItemClass

  itemCanBeSuperseded?: boolean
  // If false, items of this class cannot be superseded, only retired.
  // Default is true.

  /** Used to pre-populate item data e.g. when a new item is created. */
  defaults?: RegistryItemPayloadDefaults<P>

  validatePayload?: (item: P) => Promise<boolean>
  sanitizePayload?: (item: P) => Promise<P>

  // XXX: Confirm if obsolete and remove
  itemSorter?: (a: P, b: P) => number

  /**
   * Expression used to sort an item of this class.
   * Passed to useFilteredIndex().
   */
  keyExpression?: string

  exportFormats?: Readonly<ExportFormatConfiguration<P>[]>

  views: {
    listItemView: ItemListView<P>
    editView: ItemEditView<P>
    detailView?: ItemDetailView<P>
  }
}


export interface RegistryViewProps
<Items extends ItemClassConfigurationSet = Record<string, ItemClassConfiguration<any>>>
extends RegisterConfiguration<Items> {
  /**
   * When search is initially opened, have this query pre-defined.
   * Not very useful since there are also preset searches in the browser now.
   */
  // TODO: Obsoluete?
  defaultSearchCriteria?: CriteriaGroup

  /**
   * Default predicate for matching items
   * using quick search.
   *
   * Must return the search expression as text.
   *
   * Search expression must return a boolean and can access:
   *
   * - `obj`, which *should* be a RegisterItem instance
   *   with `obj.data` being its class-specific payload.
   *
   * E.g., if all important item classes in your register
   * specify a `name` field:
   *
   * @example (searchQuery) => `obj.data?.name?.toLowerCase().indexOf("${searchQuery.toLowerCase()}") >= 0`
   */
  getQuickSearchPredicate?: (quickSearchQuery: string) => string

  /**
   * Extension-provided additional views that don’t correspond
   * to entities like register item, change request, etc. handled by RegistryKit.
   */
  customViews?: CustomViewConfiguration[]
}

export interface CustomViewConfiguration {
  id: string
  label: string
  description: string
  view: React.FC<{
    /** View can support optional path for custom state/inner navigation (provisional). */
    path: string
  }>
  icon?: JSX.Element
}


// Item views

export interface ItemAction {
  getButtonProps:
    (item: RegisterItem<any>, itemClass: ItemClassConfiguration<any>, subregisterID?: string) =>
      ButtonProps | MenuItemProps
}

export type RegistryView = React.FC<RegistryViewProps>

type RegistryItemPayloadDefaults<P extends Payload> =
  Partial<Omit<P, 'id'>>;

/**
 * A small part of item class configuration,
 * useful e.g. for formatting related items.
 */
export type RelatedItemClassConfiguration = {
  title: string
  itemView: ItemListView<any>
}


export interface RegistryItemViewProps<P extends Payload> {
  /**
   * Item reference.
   * Glossarist, for example, uses it to determine language subregister and set appropriate writing direction.
   */
  itemRef: Omit<InternalItemReference, 'itemID'> & { itemID?: InternalItemReference['itemID'] }

  /** Item data (payload). */
  itemData: P

  className?: string
  //subregisterID?: string

  /** Deprecated */
  useRegisterItemData?: any
  /** Deprecated */
  getRelatedItemClassConfiguration?: any
}

export interface GenericRelatedItemViewProps {
  /** Currently selected item’s ref. */
  itemRef?: InternalItemReference

  /**
   * By default, clicking the item will spawn a tab via TabbedWorkspace context.
   * This prop can customize that behavior.
   */
  onJump?: () => void

  className?: string

  /**
   * Determines which item classes can be selected in the search dialog.
   * If undefined, *any* class can be chosen.
   * If empty list, no class can be chosen (weird).
   */
  availableClassIDs?: string[]

  // XXX: Check if obsolete, remove if unused
  itemSorter?: ItemClassConfiguration<any>["itemSorter"]

  /** Called to auto-create an item (can’t auto-create if not provided) */
  onCreateNew?: () => Promise<InternalItemReference>

  /** Called when current item is cleared (can’t clear if not provided) */
  onClear?: () => void

  /** Called when a new item is selected (can’t change if not provided) */
  onChange?: (newRef: InternalItemReference) => void

  /** @deprecated subregisters no longer supported. */
  availableSubregisterIDs?: string[]

  /** @deprecated */
  useRegisterItemData?: any
  //useRegisterItemData: RegisterItemDataHook

  /** @deprecated */
  getRelatedItemClassConfiguration?: any
  //getRelatedItemClassConfiguration: ExtensionContext["getRelatedItemClassConfiguration"]
}


export type ItemEditView<P extends Payload> = React.FC<ItemEditViewProps<P>>;

export interface ItemEditViewProps<P extends Payload> extends RegistryItemViewProps<P> {
  onChange?: (newData: P) => void
  onCreateRelatedItem?:
    (classID: string, subregisterID?: string) => Promise<InternalItemReference>
}

export interface ItemDetailViewProps<P extends Payload> extends RegistryItemViewProps<P> {
  //useRegisterItemData: RegisterItemDataHook
}

export type ItemDetailView<P extends Payload> = React.FC<ItemDetailViewProps<P>>;

export interface ItemListViewProps<P extends Payload> extends RegistryItemViewProps<P> {
}

export type ItemListView<P extends Payload> = React.FC<ItemListViewProps<P>>;

export type LazyItemView = React.FC<{ itemID: string }>;
