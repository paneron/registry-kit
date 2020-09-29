import type React from 'react';
import type { RepositoryViewProps } from '@riboseinc/paneron-plugin-kit/types';
import { Payload, RegisterItemClass } from './item';


export interface RegistryViewProps extends RepositoryViewProps {
  itemClassConfiguration: {
    [itemClassID: string]: ItemClassConfiguration<any>
  }
}

export type RegistryView = React.FC<RegistryViewProps>

type RegistryItemPayloadDefaults<P extends Payload> =
  Partial<Omit<Omit<P, 'id'>, 'status'>>;

interface RegistryItemViewProps<P extends Payload> {
  itemData: P
}

export interface ItemClassConfiguration<P extends Payload> {
  meta: RegisterItemClass
  defaults: RegistryItemPayloadDefaults<P>
  validatePayload: (item: P) => Promise<boolean>
  sanitizePayload: (item: P) => Promise<P>
  views: {
    listItemView: React.FC<RegistryItemViewProps<P>>
    detailView: React.FC<RegistryItemViewProps<P>>
    createView: React.FC<{
      defaults: RegistryItemPayloadDefaults<P>
      onChange: (newData: P) => void
    }>
    editView: React.FC<RegistryItemViewProps<P> & {
      onChange: (newData: P) => void
    }>
  }
}
