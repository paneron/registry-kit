/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useMemo, useCallback } from 'react';
import { jsx } from '@emotion/react';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';

import { ChangeRequestContext, updateCRObjectChangeset } from '../proposals';
import GenericStatefulTree, { type State as TreeState } from '../views/StatefulTree';
import { BrowserCtx } from '../views/BrowserCtx';
import { itemRefToItemPath } from '../views/itemPathUtils';
import { Protocols } from '../views/protocolRegistry';
import type { RegisterItem, InternalItemReference } from '../types';

import { getMaybeGroupedItemClassesAsTreeNodes } from './treeNodes';


const ItemClassTree: React.VoidFunctionComponent<Record<never, never>> = function () {

  const { performOperation, updateObjects, makeRandomID } = useContext(DatasetContext);
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const { changeRequest: activeCR, canEdit: activeCRIsEditable } = useContext(ChangeRequestContext);
  const { subregisters, itemClasses, itemClassGroups } = useContext(BrowserCtx);

  const createItem = useCallback(async function _createItem(classID: string, subregisterID?: string) {
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
  }, [activeCR, activeCRIsEditable, subregisters === undefined, spawnTab, updateObjects, makeRandomID]);

  const handleAdd: undefined | ((clsID: string) => Promise<void>) = useMemo((() =>
    !subregisters && activeCRIsEditable && performOperation
      ? (clsID) => performOperation('generating new item', createItem)(clsID)
      : undefined
  ), [createItem, subregisters === undefined, activeCRIsEditable, performOperation]);

  const getNodes = useCallback(
    ((state: TreeState) =>
      getMaybeGroupedItemClassesAsTreeNodes(itemClasses, itemClassGroups, {
        selectedItemID: state.selectedItemID ?? undefined,
        expandedGroupLabels: new Set(state.expandedItemIDs),
        onProposeItem: handleAdd,
      })),
    [itemClasses, itemClassGroups, handleAdd],
  );

  return <GenericStatefulTree
    getNodes={getNodes}
    stateKey="item-browser"
    onItemDoubleClick={(node) => spawnTab(`${Protocols.ITEM_CLASS}:${node.id}`)}
  />;
};


export default ItemClassTree;
