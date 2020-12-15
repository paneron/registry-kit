import { ExtensionMakerProps as BaseExtensionMakerProps } from '@riboseinc/paneron-extension-kit';
import { ItemClassConfigurationSet } from './types';

export interface ExtensionMakerProps
extends Omit<BaseExtensionMakerProps, 'mainView'> {
  items: ItemClassConfigurationSet
}
