/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { splitEvery } from 'ramda';
import React, { useState, useEffect, useContext } from 'react';
import { jsx, css } from '@emotion/core';
import { Classes } from '@blueprintjs/core';
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
import CriteriaTree, { CriteriaGroup } from './FilterCriteria';
import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';


export const SearchQuery: React.FC<{
  rootCriteria: CriteriaGroup
  onChange?: (rootCriteria: CriteriaGroup) => void
  itemClasses: RegistryViewProps["itemClassConfiguration"]
  availableClassIDs?: string[]
  subregisters: RegistryViewProps["subregisters"]
  className?: string
}> = function ({
  rootCriteria,
  onChange,
  itemClasses,
  availableClassIDs,
  subregisters,
  className,
}) {
  const classIDs = availableClassIDs ?? Object.keys(itemClasses);
  return (
    <CriteriaTree
      criteria={rootCriteria}
      onChange={onChange}
      itemClasses={itemClasses}
      availableClassIDs={classIDs}
      subregisters={subregisters}
      className={className}
    />
  );
};


export const RegisterItemGrid: React.FC<{
  selectedItem?: InternalItemReference;
  onSelectItem: (itemRef: InternalItemReference) => void;
  queryExpression: string;
  selectedSubregisterID?: string;
  toolbar: JSX.Element;

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
  useRegisterItemData,
  getRelatedClassConfig,
  style,
  className,
}) {
  const ctx = useContext(DatasetContext);
  //const { useObjectPaths } = useContext(DatasetContext);
  const { useFilteredIndex, useIndexDescription, useObjectPathFromFilteredIndex, useFilteredIndexPosition, useObjectData } = ctx;
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
    if (selectedItem !== undefined && !idxPosResp.isUpdating) {
      const pos = idxPosResp.value.position !== null
        ? `${idxPosResp.value.position}`
        : null;
      if (selectedIndexPos !== pos) {
        selectIndexPos(pos);
      }
    }
  }, [selectedItem, idxPosResp.isUpdating]);

  useEffect(() => {
    if (selectedIndexPos !== null && !objPathResp.isUpdating) {
      try {
        const itemRef = itemPathToItemRef(selectedSubregisterID !== undefined, objPathResp.value.objectPath);
        if (itemRef && selectedItem?.itemID !== itemRef.itemID) {
          onSelectItem(itemRef);
        }
      } catch (e) {
        console.error("Unable to construct item ref from item path", objPathResp.value.objectPath);
      }
    }
  }, [selectedIndexPos, objPathResp.isUpdating]);

  function getGridData(viewportWidth: number): GridData<RegisterItemGridData> | null {
    if (indexID) {
      const stubs = [...new Array(itemCount)].map((_, idx) => `${idx}`);
      //console.debug(`Getting grid data for ${itemCount} items…`, stubs);
      //console.debug(`Getting grid data: index status for ${indexID}`, indexProgress);
      return {
        items: splitEvery(
          Math.floor(viewportWidth / CELL_W_PX),
          stubs),
        extraData: {
          useObjectData,
          useObjectPathFromFilteredIndex,
          selectedItemID: selectedItem?.itemID,
          indexID,
          hasSubregisters: selectedSubregisterID !== undefined,
          useRegisterItemData,
          getRelatedClassConfig,
        },
        selectedItem: selectedIndexPos,
        selectItem: selectIndexPos,
        cellWidth: CELL_W_PX,
        cellHeight: CELL_H_PX,
        padding: CELL_PADDING,
      };
    }
    return null;
  }

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
        toolbar={toolbar}>
      <Grid getGridData={getGridData} />
    </Workspace>
  );
};


interface RegisterItemGridData {
  indexID: string;
  useObjectPathFromFilteredIndex: Hooks.Indexes.GetFilteredObject;
  useObjectData: Hooks.Data.GetObjectDataset;

  hasSubregisters: boolean;
  selectedItemID?: string;
  //classID: string
  //subregisterID?: string
  useRegisterItemData: RegisterItemDataHook;
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration;
}


const RegisterItem: React.FC<CellProps<RegisterItemGridData>> =
function ({ isSelected, onSelect, onOpen, extraData, itemRef, width, height, padding }) {
  const filteredObjectResp = extraData.useObjectPathFromFilteredIndex({
    indexID: extraData.indexID,
    position: parseInt(itemRef, 10),
  });
  const objPath = filteredObjectResp.value.objectPath;
  const objectDataResp = extraData.useObjectData({
    objectPaths: objPath ? [objPath] : [],
  });

  const objData = objectDataResp.value.data[objPath];
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
        width={width}
        height={height}
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
