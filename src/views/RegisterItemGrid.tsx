/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { splitEvery } from 'ramda';
import React, { useMemo, useState, useEffect, useContext } from 'react';
import { jsx, css } from '@emotion/core';
import { Button, ButtonGroup, Classes, Colors } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
import makeSidebar from '@riboseinc/paneron-extension-kit/widgets/Sidebar';
import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import makeGrid, { GridData, CellProps, LabelledGridIcon } from '@riboseinc/paneron-extension-kit/widgets/Grid';
import { Hooks } from '@riboseinc/paneron-extension-kit/types';
import {
  InternalItemReference,
  RegisterItem as RegisterItemCell, RegisterItemDataHook,
  RegistryViewProps,
  RelatedItemClassConfiguration
} from '../types';
import { itemPathToItemRef, itemRefToItemPath } from './itemPathUtils';
import CriteriaTree from './FilterCriteria';
import { CriteriaGroup } from './FilterCriteria/models';
import { BrowserCtx } from './BrowserCtx';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
import criteriaGroupToSummary from './FilterCriteria/criteriaGroupToSummary';


export const SearchQuery: React.FC<{
  rootCriteria: CriteriaGroup
  onChange?: (rootCriteria: CriteriaGroup) => void
  viewingMeta: boolean
  onViewMeta?: (newState: boolean) => void
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
    <ButtonGroup css={css`flex: 1; align-items: center; overflow: hidden;`}>
      <Popover2
          isOpen={isExpanded}
          fill
          lazy
          minimal
          popoverClassName="filter-popover"
          css={css`overflow: hidden; margin-top: -2.5px;`}
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
              <div css={css`padding: 0 10px 10px 10px; color: ${Colors.GRAY3}; font-size: 90%;`}>
                Computed query: <code>{criteriaGroupToQueryExpression(rootCriteria)}</code>
              </div>
            </>}>
        <Button
            className={className}
            active={isExpanded}
            title="Edit search criteria"
            icon='filter'
            alignText='left'
            css={css`.bp3-button-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`}
            intent={rootCriteria.criteria.length > 0 ? 'warning' : undefined}
            onClick={() => expand(!isExpanded)}>
          Showing
          {" "}
          {rootCriteria.criteria.length > 0
            ? <>items where {criteriaGroupToSummary(rootCriteria, { itemClasses, subregisters })}</>
            : <>all items</>}
        </Button>
      </Popover2>
      {onViewMeta || viewingMeta
        ? <Button
            icon="settings"
            active={viewingMeta}
            disabled={!onViewMeta}
            title="View or edit dataset metadata"
            onClick={onViewMeta ? () => onViewMeta(!viewingMeta) : undefined}
          />
        : null}
    </ButtonGroup>
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
  } = ctx;

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
        sidebar={sidebarOverride ?? (selectedItem !== undefined
          ? <SelectedRegisterItemSidebar itemRef={selectedItem} />
          : undefined)}
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


const SelectedRegisterItemSidebar: React.FC<{ itemRef: InternalItemReference, className?: string }> =
function ({ itemRef, className }) {
  const { usePersistentDatasetStateReducer  } = useContext(DatasetContext);
  const { useRegisterItemData, getRelatedItemClassConfiguration, itemClasses } = useContext(BrowserCtx);
  const { itemID, classID, subregisterID } = itemRef;
  const ListItemView = getRelatedItemClassConfiguration(classID).itemView;
  
  const Sidebar = useMemo(() => makeSidebar(usePersistentDatasetStateReducer!), []);

  const _path = itemRefToItemPath(itemRef!);

  const objectDataResp = useRegisterItemData({
    itemPaths: _path ? [_path] : [],
  });
  const objData = objectDataResp.value[_path];

  const registerItemData = objData as RegisterItemCell<any> | null;
  const itemPayload = registerItemData?.data;
  const stringItemDescription = `item at ${_path}`;

  const itemView = itemPayload
    ? <ListItemView
        getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
        useRegisterItemData={useRegisterItemData}
        subregisterID={subregisterID}
        itemData={itemPayload}
        className={className}
        itemID={registerItemData?.id ?? itemID} />
    : <>{stringItemDescription}</>;

  const clsMeta = itemClasses[classID].meta;

  return <Sidebar
    stateKey='selected-item'
    css={css`width: 280px; z-index: 1;`}
    representsSelection
    title="Selected reg. item"
    blocks={[{
      key: 'item-view',
      title: "Summary",
      height: 100,
      content: itemView,
    }, {
      key: 'class',
      title: "Classification",
      content: <>{clsMeta.title}</>,
    }]}
  />
};


const RegisterItemCell: React.FC<CellProps<RegisterItemGridData>> =
function ({ isSelected, onSelect, onOpen, extraData, itemRef, padding }) {
  const filteredObjectResp = extraData.useObjectPathFromFilteredIndex({
    indexID: extraData.indexID,
    position: parseInt(itemRef, 10),
  });
  const objPath = filteredObjectResp.value.objectPath;

  const stringItemDescription = objPath ? `item at ${objPath}` : `item #${itemRef}`;

  const objectDataResp = extraData.useRegisterItemData({
    itemPaths: objPath ? [objPath] : [],
  });


  let isUpdating: boolean = filteredObjectResp.isUpdating;
  let _itemID: string | undefined;
  let classTitle: string | undefined;
  let itemView: JSX.Element;

  if (objPath.trim() !== '') {
    try {
      const { itemID, subregisterID, classID } = itemPathToItemRef(extraData.hasSubregisters, objPath);
      const clsConfig = extraData.getRelatedClassConfig(classID);
      const ListItemView = clsConfig.itemView;

      classTitle = clsConfig.title;

      const objData = objectDataResp.value[objPath];
      const registerItemData = objData as RegisterItemCell<any> | null;
      const itemPayload = registerItemData?.data;

      _itemID = itemID;
      isUpdating = isUpdating || objectDataResp.isUpdating;
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
      classTitle = undefined;
    }
  } else {
    itemView = <>{stringItemDescription}</>;
    _itemID = undefined;
    classTitle = undefined;
  }


  return (
    <LabelledGridIcon
        isSelected={extraData.selectedItemID === _itemID && _itemID !== undefined}
        onSelect={onSelect}
        onOpen={onOpen}
        padding={padding}
        contentClassName={isUpdating ? Classes.SKELETON : undefined}
        entityType={{
          name: classTitle ?? 'reg. item',
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

const Grid = makeGrid<RegisterItemGridData>(RegisterItemCell);

const CELL_W_PX = 150;
const CELL_H_PX = 80;
const CELL_PADDING = 10;


export default RegisterItemGrid;
