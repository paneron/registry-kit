import React from 'react';
import { makeExtension } from '@riboseinc/paneron-extension-kit';
import { Extension } from '@riboseinc/paneron-extension-kit/types';
import { YAMLFileSpec } from '@riboseinc/paneron-extension-kit/object-specs/basic';
import { ExtensionMakerProps } from '@riboseinc/paneron-extension-kit/types/extension-maker';
import { RegistryViewProps } from './types';
import { RegistryView } from './views';

export type RegistryExtensionMakerProps =
  Pick<ExtensionMakerProps, 'name'> & RegistryViewProps

export type RegistryExtensionMaker =
  (opts: RegistryExtensionMakerProps) => Promise<Extension>;

export const makeRegistryExtension: RegistryExtensionMaker = function (opts) {
  const { name } = opts;

  const mainView: ExtensionMakerProps["mainView"] = async function () {
    return {
      default: () => {
        return (
          <RegistryView
            itemClassConfiguration={opts.itemClassConfiguration}
            subregisters={opts.subregisters}
          />
        );
      },
    };
  };

  return makeExtension({
    mainView,
    name,
    requiredHostAppVersion: '1.0.0-alpha19',
    datasetMigrations: {},
    objects: [
      YAMLFileSpec,
    ],
    datasetInitializer: () => import('./migrations/initial'),
  });
};
