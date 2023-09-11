/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useEffect } from 'react';
import { jsx, css } from '@emotion/react';
import { Button, IconName, Menu, MenuItem, MenuDivider, Tree, TreeNodeInfo } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import type { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import makeSearchResultList from '@riboseinc/paneron-extension-kit/widgets/SearchResultList';

import type { CriteriaGroup } from '../../FilterCriteria/models';
import criteriaGroupToQueryExpression from '../../FilterCriteria/criteriaGroupToQueryExpression';
import CRITERIA_CONFIGURATION from '../../FilterCriteria/CRITERIA_CONFIGURATION';
import { itemRefToItemPath } from '../../itemPathUtils';
import { getRegisterItemQuery } from '../../itemQueryUtils';
import { ChangeRequestContext } from '../../change-request/ChangeRequestContext';
import { updateCRObjectChangeset } from '../../change-request/objectChangeset';
import type { RegisterItem, InternalItemReference } from '../../../types';
import { BrowserCtx } from '../../BrowserCtx';
import ListItem from '../ListItem';
import { Protocols } from '../../protocolRegistry';


interface BaseState {
  selectedFolderID: string | null
  selectedItemPath: string | null
  enteredFolderID: string | null
}
interface FolderListState extends BaseState {
  enteredFolderID: null
  selectedItemPath: null
}
interface ItemListState extends BaseState {
  enteredFolderID: string
  selectedFolderID: string
}
type State = FolderListState | ItemListState

type Action =
  | { type: 'select-folder'; payload: { id: string | null; }; }
  | { type: 'enter-folder'; payload: { id: string; }; }
  | { type: 'exit-folder'; }
  | { type: 'select-item'; payload: { itemPath: string | null; }; }

const initialState: State = {
  selectedFolderID: null,
  enteredFolderID: null,
  selectedItemPath: null,
};
function validateState(loadedValue: any): loadedValue is State {
  return (
    _validateFolderID(loadedValue.enteredFolderID) &&
    _validateFolderID(loadedValue.selectedFolderID) &&
    loadedValue.selectedItemPath !== undefined
  );
};
function _validateFolderID(foldID: string) {
  return foldID !== undefined &&
  (
    foldID === null || (
      foldID.startsWith('by-item-class/') ||
      foldID.startsWith('by-subregister/')
    )
  )
}

const Browse: React.FC<{
  availableClassIDs?: string[]
  onOpenItem?: (itemPath: string) => void
  stateName?: string
  className?: string
  style?: React.CSSProperties
}> =
function ({ stateName, onOpenItem, className, style }) {
  const { performOperation, updateObjects, makeRandomID, usePersistentDatasetStateReducer } = useContext(DatasetContext);
  const { spawnTab, focusedTabURI } = useContext(TabbedWorkspaceContext);
  const { keyExpression, itemClasses, subregisters } = useContext(BrowserCtx);
  const { changeRequest: activeCR, canEdit: activeCRIsEditable } = useContext(ChangeRequestContext);

  const [ state, dispatch, ] = (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)(
    stateName ?? 'browse-sidebar',
    undefined,
    validateState,
    (prevState, action) => {
      switch (action.type) {
        case 'select-folder':
          if (prevState.enteredFolderID !== null) {
            return prevState;
          } else {
            return {
              ...prevState,
              selectedFolderID: action.payload.id,
            };
          }
        case 'enter-folder':
          if (prevState.enteredFolderID === null) {
            return {
              ...prevState,
              selectedFolderID: action.payload.id,
              enteredFolderID: action.payload.id,
            };
          } else {
            return prevState;
          }
        case 'exit-folder':
          if (prevState.enteredFolderID !== null) {
            return {
              ...prevState,
              enteredFolderID: null,
              selectedItemPath: null,
            };
          } else {
            return prevState;
          }
        case 'select-item':
          if (prevState.enteredFolderID && prevState.selectedFolderID) {
            return {
              ...prevState,
              selectedItemPath: action.payload.itemPath,
            };
          } else {
            return prevState;
          }
        default:
          throw new Error("Unexpected browse state");
      }
    },
    initialState,
    null);

  // If currently focused tab changed, select corresponding item in view
  useEffect(() => {
    if (focusedTabURI) {
      const [proto, itemPath] = focusedTabURI.split(':');
      // TODO: also check entered folder?
      if (proto === Protocols.ITEM_DETAILS) {
        dispatch({ type: 'select-item', payload: { itemPath } });
      }
    }
  }, [focusedTabURI, dispatch]);

  async function handleAdd(classID: string, subregisterID?: string) {
    if (!updateObjects || !makeRandomID || !activeCRIsEditable || !activeCR) {
      throw new Error("Unable to create item: likely current proposal is not editable or dataset is read-only");
    }
    if (subregisters && !subregisterID) {
      throw new Error("Unable to create item: register uses subregisters, but subregister ID was not provided");
    }
    const clsConfig = itemClasses[classID];
    if (!clsConfig) {
      throw new Error("Unable to generate new item data: item class configuration is missing");
    }
    const initialItemData = clsConfig?.defaults ?? {};
    const itemID = await makeRandomID();
    const ref: InternalItemReference = { classID, itemID, subregisterID };
    const registerItem: RegisterItem<any> = {
      id: itemID,
      dateAccepted: new Date(),
      status: 'valid',
      data: initialItemData,
    };
    const itemPath = itemRefToItemPath(ref);
    await updateObjects({
      commitMessage: `propose to add new ${ref.classID}`,
      objectChangeset: updateCRObjectChangeset(
        activeCR as any,
        { [itemPath]: { type: 'addition' } },
        { [itemPath]: registerItem },
      ),
      _dangerouslySkipValidation: true,
    });
    spawnTab(`${Protocols.ITEM_DETAILS}:${itemRefToItemPath(ref, activeCR.id)}`);
  }

  if (state.enteredFolderID !== null) {
    // If we are in a folder, show a tree with a single element
    // indicating currently entered folder
    // followed by windowed search result list
    // with query according to the folder (item class, subregister)

    let criteria: CriteriaGroup;
    let folderInfo: { title: string; moreMenu?: JSX.Element };

    if (state.enteredFolderID.startsWith('by-item-class/')) {
      const classID = state.enteredFolderID.split('/')[1];
      const clsConfig = itemClasses[classID];
      folderInfo = {
        title: clsConfig?.meta?.title ?? classID,
        moreMenu: clsConfig
          ? <ItemClassMenu
              cfg={itemClasses[classID]}
              onCreate={!subregisters && activeCRIsEditable && performOperation
                ? () => performOperation('generating new item', handleAdd)(classID)
                : undefined}
            />
          : undefined,
      };
      criteria = {
        require: 'all',
        criteria: [
          {
            key: 'item-class',
            query: CRITERIA_CONFIGURATION['item-class'].toQuery(
              { classID },
              { itemClasses, subregisters }),
          },
        ],
      };
    } else if (subregisters && state.enteredFolderID.startsWith('by-subregister/')) {
      const subregisterID = state.enteredFolderID.split('/')[1];
      const subregConfig = subregisters[subregisterID];
      folderInfo = {
        title: subregConfig?.title ?? subregisterID,
        moreMenu: subregConfig
          ? <SubregisterMenu
              cfg={subregConfig}
              itemClasses={itemClasses}
              onCreate={activeCRIsEditable && performOperation
                ? (clsID) => performOperation('generating new item', handleAdd)(clsID, subregisterID)
                : undefined}
            />
          : undefined,
      };
      criteria = {
        require: 'all',
        criteria: [
          {
            key: 'subregister',
            query: CRITERIA_CONFIGURATION['subregister'].toQuery(
              { subregisterID },
              { itemClasses, subregisters }),
          },
        ],
      };
    } else {
      folderInfo = { title: '' };
      criteria = { require: 'all', criteria: [] };
    }


    const queryExpression = criteriaGroupToQueryExpression(criteria);

    return (
      <div css={css`display: flex; flex-flow: column nowrap;`} className={className} style={style}>
        <Tree
          css={css`flex: 0;`}
          onNodeClick={() => dispatch({ type: 'select-item', payload: { itemPath: null }})}
          onNodeCollapse={() => dispatch({ type: 'exit-folder' })}
          onNodeDoubleClick={() => dispatch({ type: 'exit-folder' })}
          contents={[{
            id: 'opened-class',
            isSelected: state.selectedItemPath === null,
            isExpanded: true,
            hasCaret: true,
            icon: 'folder-open',
            label: folderInfo.title,
            secondaryLabel: folderInfo.moreMenu
              ? <MoreMenu>{folderInfo.moreMenu}</MoreMenu>
              : undefined,
          }]}
        />
        <div css={css`flex: 1;`}>
          <SearchResultList
            queryExpression={getRegisterItemQuery(queryExpression, activeCR ?? undefined)}
            keyExpression={keyExpression}
            selectedItemPath={state.selectedItemPath}
            onSelectItem={itemPath => dispatch({ type: 'select-item', payload: { itemPath }})}
            onOpenItem={onOpenItem ?? (itemPath => spawnTab(`${Protocols.ITEM_DETAILS}:${itemPath}`))}
          />
        </div>
      </div>
    );
  } else {
    // If we are *not* in a folder, show a list of available folders/views
    // (item classes, subregisters)

    const contents: TreeNodeInfo<{ folderID: string | null }>[] = [{
      id: 'by-item-class',
      isExpanded: true,
      hasCaret: false,
      icon: 'filter',
      label: "By item class",
      disabled: true,
      nodeData: { folderID: null },
    }, ...Object.entries(itemClasses).map(([classID, classConfig]) => ({
      isSelected: state.selectedFolderID === `by-item-class/${classID}`,
      id: classID,
      isExpanded: false,
      icon: 'folder-close' as IconName,
      hasCaret: true,
      label: classConfig.meta.title,
      nodeData: { folderID: `by-item-class/${classID}` },
      secondaryLabel:
        <MoreMenu>
          <ItemClassMenu
            cfg={classConfig}
            onCreate={!subregisters && activeCRIsEditable && performOperation
              ? () => performOperation('generating new item', handleAdd)(classID)
              : undefined}
          />
        </MoreMenu>,
    })), ...(subregisters
      ? [{
          id: 'by-subregister',
          isExpanded: true,
          hasCaret: false,
          disabled: true,
          icon: 'filter' as IconName,
          label: "By subregister",
          nodeData: { folderID: null },
        }, ...Object.entries(subregisters).map(([subregisterID, subregisterConfig]) => ({
          isSelected: state.selectedFolderID === `by-subregister/${subregisterID}`,
          id: subregisterID,
          isExpanded: false,
          icon: 'folder-close' as IconName,
          hasCaret: true,
          label: subregisterConfig.title,
          nodeData: { folderID: `by-subregister/${subregisterID}` },
          secondaryLabel:
            <MoreMenu>
              <SubregisterMenu
                cfg={subregisterConfig}
                itemClasses={itemClasses}
                onCreate={activeCRIsEditable && performOperation
                  ? (clsID) => performOperation('generating new item', handleAdd)(clsID, subregisterID)
                  : undefined}
              />
            </MoreMenu>,
        }))]
      : [])
    ];
    if (subregisters) {
      contents.push()
    }
    return (
      <Tree
        css={css`flex: 1;`}
        className={className}
        onNodeClick={node => node.nodeData?.folderID
          ? dispatch({ type: 'select-folder', payload: { id: node.nodeData.folderID }})
          : void 0}
        onNodeExpand={node => node.nodeData?.folderID
          ? dispatch({ type: 'enter-folder', payload: { id: node.nodeData.folderID }})
          : void 0}
        onNodeDoubleClick={node => node.nodeData?.folderID
          ? dispatch({ type: 'enter-folder', payload: { id: node.nodeData.folderID }})
          : void 0}
        contents={contents}
      />
    );
  }
};


const MoreMenu: React.FC<Record<never, never>> = function ({ children }) {
  return (
    <Popover2 minimal content={<>{children}</>}>
      <Button icon="more" small minimal />
    </Popover2>
  );
}


const SubregisterMenu: React.FC<{
  cfg: { title: string, itemClasses: string[] };
  itemClasses: BrowserCtx["itemClasses"];
  onCreate?: (classID: string) => void;
}> = function ({ cfg, itemClasses, onCreate }) {
  return (
    <Menu>
      <MenuDivider title={`Item classes in ${cfg.title}`} />
        {cfg.itemClasses.map(classID =>
          <MenuItem
              text={itemClasses[classID]?.meta?.title ?? classID}
              key={classID}>
            <ItemClassMenu
              cfg={itemClasses[classID]}
              onCreate={onCreate ? () => onCreate(classID) : undefined}
            />
          </MenuItem>
        )}
    </Menu>
  );
}


const ItemClassMenu: React.FC<{
  cfg: BrowserCtx["itemClasses"][string];
  onCreate?: () => void;
}> = function ({ cfg, onCreate }) {
  return (
    <Menu>
      <MenuDivider title="About this class" />
      <MenuItem multiline disabled css={css`max-width: 400px`} text={cfg.meta.description} />
      {onCreate
        ? <>
            <MenuDivider title="Quick actions" />
            <MenuItem
              text="Propose new"
              intent="primary"
              onClick={onCreate} icon="plus"
            />
          </>
        : null}
    </Menu>
  );
}


const SearchResultList = makeSearchResultList<RegisterItem<any>>(ListItem, (objPath) => ({
  name: 'reg. item',
  iconProps: {
    icon: 'document',
    title: objPath,
    htmlTitle: `Icon for item at ${objPath}`
  }
}));


export default Browse;
