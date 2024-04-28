/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useCallback, useState, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { jsx, css } from '@emotion/react';

import { Helmet } from 'react-helmet';

import { Colors } from '@blueprintjs/core';
import type { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import TabbedWorkspace, { type TabbedWorkspaceProps } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace';
import {
  makeContextProvider as makeTabbedWorkspaceContextProvider,
  TabbedWorkspaceContext,
} from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';

import {
  type RegisterItem,
  type RegisterItemDataHook,
  type RegisterStakeholder,
  type RegistryViewProps,
  type InternalItemReference,
  isRegisterItem,
  isRegisterMetadata,
} from '../types';

import { REGISTER_METADATA_FILENAME } from '../common';

import GenericRelatedItemView from './GenericRelatedItemView';
import { BrowserCtx } from './BrowserCtx';
import { formatDate, _getRelatedClass } from './util';
import RegisterHome from './detail/RegisterHome';
import protocolRegistry, { Protocols, type Protocol } from './protocolRegistry';
import {
  ChangeRequestContext,
  ChangeRequestContextProvider,
} from '../proposals/ChangeRequestContext';
import useRegisterVersion from './hooks/useRegisterVersion';
import { sidebarConfig, sidebarConfigForStakeholder } from './sidebar';
import { useItemRef, itemPathInCR } from './itemPathUtils';
export { GenericRelatedItemView };


const TabbedWorkspaceContextProvider = makeTabbedWorkspaceContextProvider<Protocol, []>(
  undefined,
  [],
  protocolRegistry);


export const RegistryView: React.FC<RegistryViewProps> =
function RegistryView (props) {
  const Workspace = useMemo(() => props.CustomWorkspace ?? RegistryWorkspace, []);
  return (
    <TabbedWorkspaceContextProvider stateKey="main-registry-view">
      <BrowserCtxProvider {...props}>
        <Workspace />
      </BrowserCtxProvider>
    </TabbedWorkspaceContextProvider>
  );
};


export const SIDEBAR_WIDTH_SETTING_NAME = 'registryMainSidebarWidthPixels'


const RegistryWorkspace: React.FC<Record<never, never>> =
function RegistryWorkspace () {
  const { changeRequest: activeChangeRequest } = useContext(ChangeRequestContext);
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const { registerMetadata, stakeholder } = useContext(BrowserCtx);
  const { useSettings, updateSetting, useGlobalSettings } = useContext(DatasetContext);

  let version: string;
  try {
    version = formatDate(useRegisterVersion());
  } catch (e) {
    //console.error("Failed to get register version", e);
    version = 'N/A';
  }

  const globalMode: TabbedWorkspaceProps<any>['globalMode'] = useMemo(
    (() => activeChangeRequest
      ? {
          content: <>
            Viewing register as proposed per “<span title="Justification of active proposal">{activeChangeRequest.justification}</span>”
          </>,
          intent: 'danger',
          onClick: () => spawnTab(Protocols.PROPOSAL_WORK),
        }
      : {
          content: <>
            Viewing register as of <span title="Date of latest accepted proposal">{version}</span>
          </>,
          intent: 'none',
          minimal: true,
        }),
    [activeChangeRequest?.id, spawnTab, version],
  );

  const { value: { settings } } = useSettings();
  const { value: { settings: globalSettings } } = useGlobalSettings();

  const stored = settings[SIDEBAR_WIDTH_SETTING_NAME];
  const sidebarWidth: number | undefined = stored && typeof stored === 'number'
    ? stored as number
    : undefined;

  const activeSidebarConfig = useMemo(
    (() => stakeholder ? sidebarConfigForStakeholder : sidebarConfig),
    [stakeholder]);

  return (
    <div css={css`flex: 1 1 auto; display: flex; flex-flow: column nowrap; overflow: hidden;`}>
      <Helmet><title>{registerMetadata?.name ?? "Unnamed registry"}</title></Helmet>
      <header css={css`
            min-height: 2em;
            flex: 0;
            line-height: 1;
            font-size: 200%;
            background: ${Colors.LIGHT_GRAY2};
            padding: .5em 20px;
            .bp4-dark & {
              background: ${Colors.DARK_GRAY2};
            }
            display: flex;
            flex-flow: row nowrap;
          `}>
        <h1 css={css`
              line-height: unset !important;
              font-size: unset !important;
              font-weight: bold;
              color: ${Colors.DARK_GRAY5};
              .bp4-dark & {
                color: ${Colors.LIGHT_GRAY3};
              }
              margin: 0;
              flex: 1;
              letter-spacing: -.025em;
            `}>
          {registerMetadata?.name ?? 'Register'}
        </h1>
        <span css={css`font-size: 50%; display: flex; gap: 10px; align-self: flex-end;`}>
          <a>Documentation</a>
          •
          <a>Feedback</a>
        </span>
      </header>
      <TabbedWorkspace
        css={css`flex: 1 1 auto;`}
        sidebarConfig={activeSidebarConfig}
        sidebarPosition={globalSettings.sidebarPosition}
        sidebarIDs={useMemo(() => ['Browse'], [])}
        newTabPrompt={newTabPrompt}
        globalMode={globalMode}
        sidebarWidth={sidebarWidth}
        onSidebarResize={useCallback((width) => {
          updateSetting({ key: SIDEBAR_WIDTH_SETTING_NAME, value: width })
        }, [updateSetting])}
      />
    </div>
  );
};


const newTabPrompt = <RegisterHome />;


const BrowserCtxProvider: React.FC<RegistryViewProps> = function BrowserCtxProvider ({
  itemClassConfiguration,
  itemClassGroups,
  subregisters,
  keyExpression,
  defaultSearchCriteria,
  getQuickSearchPredicate,
  alterApprovedCR,
  customViews,
  children,
}) {

  const { useObjectData, useRemoteUsername } = useContext(DatasetContext);
  const { focusedTabURI, spawnTab } = useContext(TabbedWorkspaceContext);


  // Active item

  const selectedItemPath: string | null = useMemo((() =>
    focusedTabURI && focusedTabURI.startsWith(`${Protocols.ITEM_DETAILS}:`)
      ? focusedTabURI.split(':')[1]
      : null
  ), [focusedTabURI]);

  const selectedItemRef: InternalItemReference | null = useItemRef(
    subregisters !== undefined,
    selectedItemPath);

  const maybeSelectedRegisterItemData: Record<string, any> | null = useObjectData({
    objectPaths: selectedItemPath ? [selectedItemPath] : [],
  }).value.data[selectedItemPath ?? ''];

  const selectedRegisterItem: BrowserCtx['selectedRegisterItem'] = useMemo((() =>
    selectedItemRef
      ? maybeSelectedRegisterItemData &&
        isRegisterItem(maybeSelectedRegisterItemData)
          ? {
              item: maybeSelectedRegisterItemData,
              ref: selectedItemRef,
              itemClass: itemClassConfiguration[selectedItemRef.classID],
            }
          : undefined
      : null
  ), [selectedItemRef, maybeSelectedRegisterItemData]);


  // Active CR

  const [ activeChangeRequestID, setActiveChangeRequestID ] = useState<string | null>(null);


  // TODO: Confirm that end extensions using RegistryKit can’t just import hooks
  // from RegistryKit and we really have to pass this to them via context
  // TODO: Why not use useObjectData directly? Since register item paths
  // are just object paths. The casting here is optimistic, since an item at given path
  // may not be a RegisterItem.
  const useRegisterItemData: RegisterItemDataHook = useCallback((opts) => {
    const { changeRequest: activeChangeRequest } = useContext(ChangeRequestContext);

    // Original item path mapped to its potential alternative path in current CR,
    // if the item is clarified or added in it.
    // TODO(perf): Access CR data and check whether the item is affected instead of blindly trying CR paths
    const pathsToRequest = useMemo(() => {
      const pathsToRequest: Record<string, string> = {};

      for (const givenItemPath of opts.itemPaths) {
        pathsToRequest[givenItemPath] = givenItemPath;

        // Don’t use CR alternative path for any path that is already explicitly in-CR.
        // TODO(perf): move out of the loop what’s possible, use map-reduce maybe too
        if (!opts.ignoreActiveCR && !givenItemPath.startsWith('/proposals') && activeChangeRequest?.id) {
          pathsToRequest[itemPathInCR(givenItemPath, activeChangeRequest.id)] = givenItemPath;
        }
      }
      return pathsToRequest;
    }, [activeChangeRequest?.id, opts.itemPaths.sort().toString()]);

    const objectPaths = Object.keys(pathsToRequest).sort();

    const result = useObjectData({
      objectPaths,
      //nounLabel: 'register item(s)',
    }) as ValueHook<{ data: Record<string, Record<string, any> | null> }>;

    const itemData = useMemo(() => {
      const itemData: Record<string, RegisterItem<any> | null> = {};
      for (const [alternativePath, itemPath] of Object.entries(pathsToRequest)) {
        const data = result.value.data[alternativePath]
          ?? result.value.data[itemPath]
          ?? null;
        if (isRegisterItem(data) || data === null) {
          itemData[itemPath] = data;
        }
      }
      return itemData;
    }, [pathsToRequest, result.value.data]);

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
  }, [useObjectData, activeChangeRequestID]);


  // Register data

  const registerMetadataReq = useObjectData({
    objectPaths: [REGISTER_METADATA_FILENAME],
    nounLabel: 'register meta',
  }) as ValueHook<{ data: Record<string, Record<string, any> | null> }>;
  const maybeRegisterMetadata =
    registerMetadataReq.value.data?.[REGISTER_METADATA_FILENAME] ??
    (registerMetadataReq.isUpdating ? undefined : null);
  const registerMetadata = !maybeRegisterMetadata || isRegisterMetadata(maybeRegisterMetadata)
    ? maybeRegisterMetadata
    : null;

  const remoteUsername: string | undefined = useRemoteUsername().value.username;

  const stakeholder: RegisterStakeholder | undefined = useMemo((() => remoteUsername
    ? (registerMetadata?.stakeholders ?? []).
        find(s => s.gitServerUsername === remoteUsername)
    : undefined
  ), [remoteUsername, registerMetadata]);

  const getRelatedItemClassConfiguration = useMemo(
    (() => _getRelatedClass(itemClassConfiguration)),
    [itemClassConfiguration]);

  const [activeChangeRequestIDDebounced] = useDebounce(activeChangeRequestID, 200);
  const customViewsMemoized = useMemo((() => customViews ?? []), [customViews]); 

  return (
    <BrowserCtx.Provider
        value={useMemo((() => ({
          stakeholder,
          registerMetadata,
          offline: remoteUsername === undefined ? true : undefined,

          subregisters,
          alterApprovedCR,
          itemClasses: itemClassConfiguration,
          itemClassGroups,

          jumpTo: spawnTab,

          selectedRegisterItem,

          activeChangeRequestID: activeChangeRequestIDDebounced,
          setActiveChangeRequestID,

          useRegisterItemData,
          getRelatedItemClassConfiguration,
          customViews: customViewsMemoized,

          keyExpression,
          defaultSearchCriteria,
          getQuickSearchPredicate,
        })), [
          selectedRegisterItem,
          activeChangeRequestIDDebounced,
          stakeholder,
          registerMetadata,
          remoteUsername,
          subregisters,
          spawnTab,
          useRegisterItemData,
          customViewsMemoized,
          itemClassConfiguration,
          subregisters,
          keyExpression,
          defaultSearchCriteria,
          getQuickSearchPredicate,
        ])}>
      <ChangeRequestContextProvider changeRequestID={activeChangeRequestIDDebounced}>
        {children}
      </ChangeRequestContextProvider>
    </BrowserCtx.Provider>
  );
}
