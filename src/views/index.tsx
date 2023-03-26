/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState, useMemo } from 'react';
import { jsx, css } from '@emotion/react';

import { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import TabbedWorkspace, { TabbedWorkspaceProps } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace';
import {
  makeContextProvider as makeTabbedWorkspaceContextProvider,
  TabbedWorkspaceContext,
} from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';

import {
  type RegisterItem,
  type RegisterItemDataHook,
  type RegisterStakeholder,
  type RegistryViewProps,
  isRegisterItem,
  isRegisterMetadata,
  isInternalItemReference,
} from '../types';

import { REGISTER_METADATA_FILENAME } from '../common';

import GenericRelatedItemView from './GenericRelatedItemView';
import { sidebarConfig, SidebarID, sidebarIDs } from './sidebar';
import { BrowserCtx } from './BrowserCtx';
import { _getRelatedClass } from './util';
import RegisterHome from './detail/RegisterHome';
import protocolRegistry, { Protocols, type Protocol } from './protocolRegistry';
import {
  ChangeRequestContext,
  ChangeRequestContextProvider,
} from './change-request/ChangeRequestContext';
import { itemPathInCR, itemPathToItemRefLike } from './itemPathUtils';
export { GenericRelatedItemView };


const TabbedWorkspaceContextProvider = makeTabbedWorkspaceContextProvider<Protocol, SidebarID>(
  'Browse',
  sidebarIDs,
  protocolRegistry);


export const RegistryView: React.FC<RegistryViewProps> = function (props) {
  return (
    <TabbedWorkspaceContextProvider stateKey="main-registry-view">
      <BrowserCtxProvider {...props}>
        <RegistryWorkspace />
      </BrowserCtxProvider>
    </TabbedWorkspaceContextProvider>
  );
};


const SIDEBAR_WIDTH_SETTING_NAME = 'registryMainSidebarWidthPixels'


const RegistryWorkspace: React.FC<Record<never, never>> = function () {
  const { changeRequest: activeChangeRequest } = useContext(ChangeRequestContext);
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const { useSettings, updateSetting } = useContext(DatasetContext);

  const globalMode: TabbedWorkspaceProps<any>['globalMode'] = useMemo(
    (() => activeChangeRequest
      ? {
          content: <>
            Viewing register as proposed — contents shown may differ from version in effect
          </>,
          intent: 'danger',
          onClick: () => spawnTab(`${Protocols.CHANGE_REQUEST}:/proposals/${activeChangeRequest.id}/main.yaml`),
        }
      : undefined),
    [activeChangeRequest?.id],
  );

  const { value: { settings } } = useSettings();

  const stored = settings[SIDEBAR_WIDTH_SETTING_NAME]
  const sidebarWidth: number | undefined = stored && typeof stored === 'number'
    ? stored as number
    : undefined;

  return <TabbedWorkspace
    css={css`flex: 1 1 auto;`}
    sidebarConfig={sidebarConfig}
    sidebarIDs={sidebarIDs}
    newTabPrompt={<RegisterHome />}
    globalMode={globalMode}
    sidebarWidth={sidebarWidth}
    onSidebarResize={(width) => {
      updateSetting({ key: SIDEBAR_WIDTH_SETTING_NAME, value: width })
    }}
  />
};


const BrowserCtxProvider: React.FC<RegistryViewProps> = function ({
  itemClassConfiguration,
  subregisters,
  keyExpression,
  defaultSearchCriteria,
  customViews,
  children,
}) {

  const { useObjectData, useRemoteUsername } = useContext(DatasetContext);
  const { focusedTabURI, spawnTab } = useContext(TabbedWorkspaceContext);

  const selectedItemPath: string | null =
    focusedTabURI && focusedTabURI.startsWith(`${Protocols.ITEM_DETAILS}:`)
      ? focusedTabURI.split(':')[1]
      : null;

  const selectedItemRef: Record<string, string> | null =
    selectedItemPath
      ? itemPathToItemRefLike(subregisters !== undefined, selectedItemPath)
      : null;

  const maybeSelectedRegisterItemData: Record<string, any> | null = useObjectData({
    objectPaths: selectedItemPath ? [selectedItemPath] : [],
  }).value.data[selectedItemPath ?? ''];

  const selectedRegisterItem: BrowserCtx['selectedRegisterItem'] =
    isInternalItemReference(selectedItemRef)
      ? maybeSelectedRegisterItemData &&
        isRegisterItem(maybeSelectedRegisterItemData)
          ? {
              item: maybeSelectedRegisterItemData,
              ref: selectedItemRef,
              itemClass: itemClassConfiguration[selectedItemRef.classID],
            }
        : undefined
      : null;

  // TODO: Confirm that end extensions using RegistryKit can’t just import hooks
  // from RegistryKit and we really have to pass this to them via context
  // TODO: Why not use useObjectData directly? Since register item paths
  // are just object paths. The casting here is optimistic, since an item at given path
  // may not be a RegisterItem.
  const useRegisterItemData: RegisterItemDataHook = (opts) => {
    // Original item path mapped to its potential alternative path in current CR,
    // if the item is clarified or added in it.
    // TODO(perf): Access CR data and check whether the item is affected instead of blindly trying CR paths
    const pathsToRequest: Record<string, string> = {};

    const { changeRequest: activeChangeRequest } = useContext(ChangeRequestContext);


    for (const givenItemPath of opts.itemPaths) {
      pathsToRequest[givenItemPath] = givenItemPath;

      // Don’t use CR alternative path for any path that is already explicitly in-CR.
      // TODO(perf): move out of the loop what’s possible, use map-reduce maybe too
      if (!opts.ignoreActiveCR && !givenItemPath.startsWith('/proposals') && activeChangeRequest?.id) {
        pathsToRequest[itemPathInCR(givenItemPath, activeChangeRequest.id)] = givenItemPath;
      }
    }

    const result = useObjectData({
      objectPaths: Object.keys(pathsToRequest),
    }) as ValueHook<{ data: Record<string, Record<string, any> | null> }>;

    const itemData: Record<string, RegisterItem<any> | null> = {};
    for (const [alternativePath, itemPath] of Object.entries(pathsToRequest)) {
      const data = result.value.data[alternativePath]
        ?? result.value.data[itemPath]
        ?? null;
      if (isRegisterItem(data) || data === null) {
        itemData[itemPath] = data;
      }
    }

    // Convert dates
    // const parsedData: Record<string, RegisterItem<any> | null> = Object.entries(result.value.data).
    // map(([ path, data ]) => {
    //   return {
    //     [path]: data !== null
    //       ? {
    //           ...data,
    //           dateAccepted: parseISO(data!.dateAccepted as unknown as string),
    //         }
    //       : null,
    //   };
    // }).
    // reduce((p, c) => ({ ...p, ...c }), {});

    return {
      ...result,
      value: itemData,
    };
  };


  // Register data

  const registerMetadataReq = useObjectData({
    objectPaths: [REGISTER_METADATA_FILENAME],
  }) as ValueHook<{ data: Record<string, Record<string, any> | null> }>;
  const maybeRegisterMetadata =
    registerMetadataReq.value.data?.[REGISTER_METADATA_FILENAME] ??
    (registerMetadataReq.isUpdating ? undefined : null);
  const registerMetadata = !maybeRegisterMetadata || isRegisterMetadata(maybeRegisterMetadata)
    ? maybeRegisterMetadata
    : null;

  const remoteUsername: string | undefined = useRemoteUsername().value.username;

  const stakeholder: RegisterStakeholder | undefined = remoteUsername
    ? (registerMetadata?.stakeholders ?? []).
      find(s => s.gitServerUsername === remoteUsername)
    : undefined;


  // Active CR

  const [ activeChangeRequestID, setActiveChangeRequestID ] = useState<string | null>(null);

  const getRelatedClass = _getRelatedClass(itemClassConfiguration);

  return (
    <BrowserCtx.Provider
        value={{
          stakeholder,
          registerMetadata,

          subregisters,
          itemClasses: itemClassConfiguration,

          jumpTo: spawnTab,

          selectedRegisterItem,

          activeChangeRequestID,
          setActiveChangeRequestID,

          useRegisterItemData,
          getRelatedItemClassConfiguration: getRelatedClass,
          customViews: customViews ?? [],

          keyExpression,
          defaultSearchCriteria,
        }}>
      <ChangeRequestContextProvider changeRequestID={activeChangeRequestID}>
        {children}
      </ChangeRequestContextProvider>
    </BrowserCtx.Provider>
  );
}
