import React from 'react';
import { makeExtension } from '@riboseinc/paneron-extension-kit';
import type { Extension } from '@riboseinc/paneron-extension-kit/types';
import ErrorBoundary from '@riboseinc/paneron-extension-kit/widgets/ErrorBoundary';
import type { ExtensionMakerProps } from '@riboseinc/paneron-extension-kit/types/extension-maker';
import type { RegistryViewProps } from './types';
import type { ItemClassConfiguration } from './types/views';
import datasetInitializer from './migrations/initial';
import { RegistryView } from './views';

export type RegistryExtensionMakerProps =
  Pick<ExtensionMakerProps, 'name'> & RegistryViewProps

export type RegistryExtensionMaker =
  (opts: RegistryExtensionMakerProps) => Promise<Extension>;

export const makeRegistryExtension: RegistryExtensionMaker = function (opts) {
  const { name } = opts;

  for (const cls of Object.values(opts.itemClassConfiguration)) {
    for (const [viewID, view] of Object.entries(cls.views)) {
      const View = view as any;
      if (View) {
        cls.views[viewID as keyof ItemClassConfiguration<any>["views"]] = function WrappedRegisterItemView(...props) {
          return (
            <ErrorBoundary
                viewName={`Detail view for ${cls.meta.title}`}
                inline={viewID === 'listItemView'}>
              <View {...props} />
            </ErrorBoundary>
          );
        };
      }
    }
  }

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
