/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { splitEvery } from 'ramda';
import React, { useMemo, useState, useEffect, useContext } from 'react';
import makeSidebar from '@riboseinc/paneron-extension-kit/widgets/Sidebar';
import { jsx, css } from '@emotion/core';
import { Button, Classes, Colors, ControlGroup, Text } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import makeGrid, { GridData, CellProps, LabelledGridIcon } from '@riboseinc/paneron-extension-kit/widgets/Grid';
import {
  InternalItemReference,
  RegisterItem, RegisterItemDataHook,
  RegistryViewProps,
  RelatedItemClassConfiguration
} from '../types';
import { Hooks } from '@riboseinc/paneron-extension-kit/types';
import { itemPathToItemRef } from './itemPathUtils';
import CriteriaTree from './FilterCriteria';
import { CriteriaGroup } from './FilterCriteria/models';
import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import { Popover2 } from '@blueprintjs/popover2';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
import criteriaGroupToSummary from './FilterCriteria/criteriaGroupToSummary';


export const SearchQuery: React.FC<{
  rootCriteria: CriteriaGroup
  onChange?: (rootCriteria: CriteriaGroup) => void
  viewingMeta: boolean
  onViewMeta?: () => void
  itemClasses: RegistryViewProps["itemClassConfiguration"]
  availableClassIDs?: string[]
  subregisters: RegistryViewProps["subregisters"]
  className?: string
}> = function ({
  rootCriteria,
  onChange,
  viewingMeta,
  onViewMeta,
  itemClasses,
  availableClassIDs,
  subregisters,
  className,
}) {
  const [isExpanded, expand] = useState(false);
  const classIDs = availableClassIDs ?? Object.keys(itemClasses);
  return (
    <ControlGroup css={css`flex: 1; align-items: center; overflow: hidden;`}>
      <Popover2
          isOpen={isExpanded}
          minimal
          fill
          lazy
          content={
            <>
              <CriteriaTree
                criteria={rootCriteria}
                onChange={onChange}
                itemClasses={itemClasses}
                availableClassIDs={classIDs}
                subregisters={subregisters}
                css={css`width: 100vw;`}
              />
              <div css={css`padding: 10px; color: ${Colors.GRAY3}; font-size: 90%;`}>
                Underlying query expression: <code>{criteriaGroupToQueryExpression(rootCriteria)}</code>
              </div>
            </>}>
        <Button
            className={className}
            active={isExpanded}
            title="Edit search criteria"
            icon={isExpanded ? 'chevron-down' : 'chevron-right'}
            intent={rootCriteria.criteria.length > 0 ? 'primary' : undefined}
            onClick={() => expand(!isExpanded)}>
          Find
        </Button>
      </Popover2>
      <Text ellipsize css={css`flex: 1; padding: 0 10px;`}>
        {criteriaGroupToSummary(rootCriteria, { itemClasses, subregisters })}
      </Text>
      {onViewMeta || viewingMeta
        ? <Button
            icon="settings"
            active={viewingMeta}
            title="View/edit dataset meta"
            onClick={onViewMeta && !viewingMeta ? onViewMeta : undefined}
          />
        : null}
    </ControlGroup>
  );
};


export const RegisterItemGrid: React.FC<{
  selectedItem?: InternalItemReference;
  onSelectItem: (itemRef: InternalItemReference) => void;
  queryExpression: string;
  selectedSubregisterID?: string;
  toolbar: JSX.Element;
  sidebarOverride?: JSX.Element;

  useRegisterItemData: RegisterItemDataHook;
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration;

  style?: React.CSSProperties;
  className?: string;
}> = function ({
  selectedItem,
  onSelectItem,
  queryExpression,
  selectedSubregisterID,
  toolbar,
  sidebarOverride,
  useRegisterItemData,
  getRelatedClassConfig,
  style,
  className,
}) {
  const ctx = useContext(DatasetContext);
  //const { useObjectPaths } = useContext(DatasetContext);
  const {
    useFilteredIndex,
    useIndexDescription,
    useObjectPathFromFilteredIndex,
    useFilteredIndexPosition,
    usePersistentDatasetStateReducer,
  } = ctx;
  
  const Sidebar = useMemo(() => makeSidebar(usePersistentDatasetStateReducer!), []);

  const [selectedIndexPos, selectIndexPos] = useState<string | null>(null);

  const normalizedQueryExp = queryExpression.trim();
  const indexReq = useFilteredIndex({ queryExpression: normalizedQueryExp });
  const indexID: string = indexReq.value.indexID ?? '';

  const indexDescReq = useIndexDescription({ indexID });
  const itemCount = indexDescReq.value.status.objectCount;
  const indexProgress = indexDescReq.value.status.progress;

  const objPathResp = useObjectPathFromFilteredIndex({
    indexID,
    position: selectedIndexPos ? parseInt(selectedIndexPos, 10) : 0,
  });

  const idxPosResp = useFilteredIndexPosition({
    indexID,
    objectPath: objPathResp.value.objectPath,
  });

  useEffect(() => {
    if (selectedItem !== undefined && !idxPosResp.isUpdating && !objPathResp.isUpdating) {
      const pos = idxPosResp.value.position !== null
        ? `${idxPosResp.value.position}`
        : null;
      if (selectedIndexPos !== pos) {
        selectIndexPos(pos);
      }
    }
  }, [selectedItem, idxPosResp.isUpdating, objPathResp.isUpdating]);

  useEffect(() => {
    if (selectedIndexPos !== null && !objPathResp.isUpdating && !idxPosResp.isUpdating) {
      try {
        const itemRef = itemPathToItemRef(selectedSubregisterID !== undefined, objPathResp.value.objectPath);
        if (itemRef && selectedItem?.itemID !== itemRef.itemID) {
          onSelectItem(itemRef);
        }
      } catch (e) {
        console.error("Unable to construct item ref from item path", objPathResp.value.objectPath);
      }
    }
  }, [selectedIndexPos, objPathResp.isUpdating, idxPosResp.isUpdating]);

  const extraData: RegisterItemGridData = {
    useObjectPathFromFilteredIndex,
    selectedItemID: selectedItem?.itemID,
    indexID,
    hasSubregisters: selectedSubregisterID !== undefined,
    useRegisterItemData,
    getRelatedClassConfig,
  };

  function getGridData(viewportWidth: number): GridData<RegisterItemGridData> | null {
    if (indexID) {
      const stubs = [...new Array(itemCount)].map((_, idx) => `${idx}`);
      //console.debug(`Getting grid data for ${itemCount} items…`, stubs);
      //console.debug(`Getting grid data: index status for ${indexID}`, indexProgress);
      return {
        items: splitEvery(
          Math.floor(viewportWidth / CELL_W_PX),
          stubs),
        extraData,
        selectedItem: selectedIndexPos,
        selectItem: selectIndexPos,
        cellWidth: CELL_W_PX,
        cellHeight: CELL_H_PX,
        padding: CELL_PADDING,
      };
    }
    return null;
  }

  const maybeSelectedItemSidebar = <Sidebar
    stateKey='selected-item'
    css={css`width: 280px; z-index: 1;`}
    representsSelection
    title="Selected item"
    blocks={[{
      key: 'item-view',
      title: "Summary",
      height: 100,
      content: selectedIndexPos !== null
        ? <RegisterItem
            isSelected
            extraData={extraData}
            itemRef={selectedIndexPos}
            padding={10}
          />
        : <>No item is selected.</>,
    }]}
  />;

  return (
    <Workspace
        css={css`
          flex: 1 1 auto;
        `}
        style={style}
        className={className}
        statusBarProps={{
          descriptiveName: { plural: 'register items', singular: 'register item' },
          totalCount: itemCount,
          progress: indexProgress,
        }}
        sidebar={sidebarOverride ?? maybeSelectedItemSidebar}
        toolbar={toolbar}>
      <Grid getGridData={getGridData} />
    </Workspace>
  );
};


interface RegisterItemGridData {
  indexID: string;
  useObjectPathFromFilteredIndex: Hooks.Indexes.GetFilteredObject;

  hasSubregisters: boolean;
  selectedItemID?: string;
  //classID: string
  //subregisterID?: string
  useRegisterItemData: RegisterItemDataHook;
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration;
}


const RegisterItem: React.FC<CellProps<RegisterItemGridData>> =
function ({ isSelected, onSelect, onOpen, extraData, itemRef, padding }) {
  const filteredObjectResp = extraData.useObjectPathFromFilteredIndex({
    indexID: extraData.indexID,
    position: parseInt(itemRef, 10),
  });
  const objPath = filteredObjectResp.value.objectPath;
  const objectDataResp = extraData.useRegisterItemData({
    itemPaths: objPath ? [objPath] : [],
  });

  const objData = objectDataResp.value[objPath];
  const registerItemData = objData as RegisterItem<any> | null;
  const itemPayload = registerItemData?.data;

  const isUpdating = filteredObjectResp.isUpdating || objectDataResp.isUpdating;

  const stringItemDescription = objPath ? `item at ${objPath}` : `item #${itemRef}`;

  let _itemID: string | undefined;
  let itemView: JSX.Element;

  if (objPath.trim() !== '') {
    try {
      const { itemID, classID, subregisterID } = itemPathToItemRef(extraData.hasSubregisters, objPath);
      _itemID = itemID;
      const ListItemView = extraData.getRelatedClassConfig(classID).itemView;
      itemView = itemPayload
        ? <ListItemView
            getRelatedItemClassConfiguration={extraData.getRelatedClassConfig}
            useRegisterItemData={extraData.useRegisterItemData}
            subregisterID={subregisterID}
            itemData={itemPayload}
            itemID={registerItemData?.id ?? 'N/A'} />
        : <>{stringItemDescription}</>;
    } catch (e) {
      itemView = <>{stringItemDescription}</>;
      _itemID = undefined;
    }
  } else {
    itemView = <>{stringItemDescription}</>;
    _itemID = undefined;
  }


  return (
    <LabelledGridIcon
        isSelected={extraData.selectedItemID === _itemID && _itemID !== undefined}
        onSelect={onSelect}
        onOpen={onOpen}
        padding={padding}
        contentClassName={isUpdating ? Classes.SKELETON : undefined}
        entityType={{
          name: 'reg. item',
          iconProps: {
            icon: 'document',
            title: stringItemDescription,
            htmlTitle: `Icon for ${stringItemDescription}`
          },
        }}>
      {itemView}
    </LabelledGridIcon>
  );
};

const Grid = makeGrid<RegisterItemGridData>(RegisterItem);

const CELL_W_PX = 150;
const CELL_H_PX = 80;
const CELL_PADDING = 10;


export default RegisterItemGrid;
