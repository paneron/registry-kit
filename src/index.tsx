import React from 'react';
import { makeExtension } from '@riboseinc/paneron-extension-kit';
import type { Extension } from '@riboseinc/paneron-extension-kit/types';
import type { ExtensionMakerProps } from '@riboseinc/paneron-extension-kit/types/extension-maker';
import type { RegistryViewProps } from './types';
import datasetInitializer from './migrations/initial';
import { RegistryView } from './views';

export type RegistryExtensionMakerProps =
  Pick<ExtensionMakerProps, 'name'> & RegistryViewProps

export type RegistryExtensionMaker =
  (opts: RegistryExtensionMakerProps) => Promise<Extension>;

export const makeRegistryExtension: RegistryExtensionMaker = function (opts) {
  const { name } = opts;

  const mainView: ExtensionMakerProps["mainView"] = function _RegistryView () {
    return (
      <RegistryView
        itemClassConfiguration={opts.itemClassConfiguration}
        subregisters={opts.subregisters}
      />
    );
  };

  return makeExtension({
    mainView,
    name,
    requiredHostAppVersion: '2.0.0',
    datasetMigrations: {},
    datasetInitializer,
  });
};


import { BrowserCtx } from './views/BrowserCtx';
import { itemRefToItemPath, incompleteItemRefToItemPathPrefix } from './views/itemPathUtils';
import GenericRelatedItemView from './views/GenericRelatedItemView';
import { PropertyDetailView } from './views/util';
import CRITERIA_CONFIGURATION from './views/FilterCriteria/CRITERIA_CONFIGURATION';

export default {
  makeRegistryExtension,
  itemRefToItemPath,
  incompleteItemRefToItemPathPrefix,
  BrowserCtx,
  CRITERIA_CONFIGURATION,
  GenericRelatedItemView,
  PropertyDetailView,
};
