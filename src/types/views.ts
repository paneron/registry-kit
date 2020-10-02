import type React from 'react';
import type { ObjectDataRequest, PluginFC, RepositoryViewProps, ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { Payload, RegisterItem, RegisterItemClass } from './item';


export type RegisterItemDataHook<P extends Payload = Payload> =
  (paths: ObjectDataRequest) => ValueHook<Record<string, RegisterItem<P>>>;


export interface RegistryViewProps extends RepositoryViewProps {
  itemClassConfiguration: {
    [itemClassID: string]: ItemClassConfiguration<any>
  }
}

export type RegistryView = React.FC<RegistryViewProps>

type RegistryItemPayloadDefaults<P extends Payload> =
  Partial<Omit<P, 'id'>>;


export type RelatedItemClassConfiguration = {
  title: string
  itemView: ItemListView<any>
}

interface RegistryItemViewProps<P extends Payload> {
  itemData: P
  getRelatedItemClassConfiguration: (classID: string) => RelatedItemClassConfiguration
}

export type ItemEditView<P> = PluginFC<RegistryItemViewProps<P> & {
  onChange?: (newData: P) => void
}>;
export type ItemDetailView<P> = PluginFC<RegistryItemViewProps<P> & {
  useRegisterItemData: RegisterItemDataHook
}>;
export type ItemListView<P> = PluginFC<RegistryItemViewProps<P>>;
export type LazyItemView = PluginFC<{ itemID: string }>;

export interface ItemClassConfiguration<P extends Payload> {
  meta: RegisterItemClass
  defaults: RegistryItemPayloadDefaults<P>
  validatePayload: (item: P) => Promise<boolean>
  sanitizePayload: (item: P) => Promise<P>

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
