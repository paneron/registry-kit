/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { splitEvery } from 'ramda';
import React, { useMemo, useState, useEffect, useContext } from 'react';
import { jsx, css } from '@emotion/core';
import { Button, ButtonGroup, Classes, Colors, Tag } from '@blueprintjs/core';
import { Popover2, Tooltip2 } from '@blueprintjs/popover2';
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
import { BrowserCtx } from './BrowserCtx';
import { itemPathToItemRef, itemRefToItemPath } from './itemPathUtils';
import CriteriaTree from './FilterCriteria';
import { CriteriaGroup, CriteriaTransformer } from './FilterCriteria/models';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
import criteriaGroupToSummary from './FilterCriteria/criteriaGroupToSummary';
import CRITERIA_CONFIGURATION from './FilterCriteria/CRITERIA_CONFIGURATION';
import ItemSummary from './sidebar-blocks/ItemSummary';
import ItemClass from './sidebar-blocks/ItemClass';


export const SearchQuery: React.FC<{
  rootCriteria: CriteriaGroup
  onCriteriaChange?: (rootCriteria: CriteriaGroup) => void
  viewingMeta: boolean
  onViewMeta?: (newState: boolean) => void
  itemClasses: RegistryViewProps["itemClassConfiguration"]
  availableClassIDs?: string[]
  subregisters: RegistryViewProps["subregisters"]
  className?: string
}> = function ({
  rootCriteria,
  onCriteriaChange,
  viewingMeta,
  onViewMeta,
  itemClasses,
  availableClassIDs,
  subregisters,
  className,
}) {
  const classIDs = availableClassIDs ?? Object.keys(itemClasses);
  return (
    <ButtonGroup css={css`flex: 1; align-items: center; overflow: hidden;`} className={className}>
      <Popover2
          minimal
          popoverClassName="filter-popover"
          css={css`& { flex: unset !important }`} // BP3 defualt styling stretches popover trigger inside button group.
          content={
            <>
              <CriteriaTree
                criteria={rootCriteria}
                onChange={onCriteriaChange}
                itemClasses={itemClasses}
                availableClassIDs={classIDs}
                subregisters={subregisters}
                css={css`width: 100vw; max-height: 50vh; overflow-y: auto;`}
              />
              <div css={css`margin-top: 5px; padding: 0 10px 10px 10px; color: ${Colors.GRAY3}; font-size: 90%;`}>
                Computed query: <code>{criteriaGroupToQueryExpression(rootCriteria)}</code>
              </div>
            </>}>
        <Button
            title="Edit search criteria"
            icon='filter'
            alignText='left'
            rightIcon={rootCriteria.criteria.length > 0
              ? <Tooltip2
                    placement="right"
                    minimal
                    content={<>Showing items where {criteriaGroupToSummary(rootCriteria, { itemClasses, subregisters })}</>}>
                  <Tag intent="success" round>on</Tag>
                </Tooltip2>
              : <Tag round>showing all items</Tag>}>
          Filter
        </Button>
      </Popover2>
      {rootCriteria.criteria.length > 0
        ? <Button
            disabled={!onCriteriaChange}
            icon="filter-remove"
            title="Clear query (show all)"
            onClick={() => onCriteriaChange!({ criteria: [], require: 'all' })} />
        : null}
      {/*<CRMenu selected={activeCRID} onSelect={onSelectCR} />*/}
      {onViewMeta || viewingMeta
        ? <Button
            icon="settings"
            active={viewingMeta}
            disabled={!onViewMeta}
            title="View or edit dataset metadata"
            onClick={onViewMeta ? () => onViewMeta(!viewingMeta) : undefined}
            css={css`margin-left: 10px;`}
          />
        : null}
    </ButtonGroup>
  );
};


export const RegisterItemGrid: React.FC<{
  selectedItem?: InternalItemReference;
  onSelectItem: (itemRef: InternalItemReference | null) => void;
  onOpenItem: (itemRef: InternalItemReference) => void;
  onTransformFilterCriteria?: (transformer: CriteriaTransformer) => void
  queryExpression: string; // Should return just the expressions, no “return” statement etc.
  hasSubregisters?: true;
  toolbar: JSX.Element;
  sidebarOverride?: JSX.Element;

  useRegisterItemData: RegisterItemDataHook;
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration;

  style?: React.CSSProperties;
  className?: string;
}> = function ({
  selectedItem,
  onSelectItem,
  onOpenItem,
  onTransformFilterCriteria,
  queryExpression,
  hasSubregisters,
  toolbar,
  sidebarOverride,
  useRegisterItemData,
  getRelatedClassConfig,
  style,
  className,
}) {
  const ctx = useContext(DatasetContext);
  const {
    useFilteredIndex,
    useIndexDescription,
    useObjectPathFromFilteredIndex,
    getObjectPathFromFilteredIndex,
    getFilteredIndexPosition,
  } = ctx;

  const [selectedIndexPos, selectIndexPos] = useState<string | null>(null);

  const normalizedQueryExp = `return (objPath.startsWith("/subregisters/") || (objPath.split("/").length >= 3 && !objPath.startsWith("/change-requests/"))) && ${queryExpression.trim()}`;
  const indexReq = useFilteredIndex({ queryExpression: normalizedQueryExp });
  const indexID: string = indexReq.value.indexID ?? '';

  const indexDescReq = useIndexDescription({ indexID });
  const itemCount = indexDescReq.value.status.objectCount;
  const indexProgress = indexDescReq.value.status.progress;

  useEffect(() => {
    if (selectedItem !== undefined && indexID !== '') {
      getFilteredIndexPosition({ indexID, objectPath: itemRefToItemPath(selectedItem) }).then(({ position }) => {
        if (selectedIndexPos !== position && position !== null) {
          selectIndexPos(`${position}`);
        }
      });
    }
  }, [selectedItem, indexID]);

  function selectItemByPosition(pos: string) {
    getObjectPathFromFilteredIndex({ indexID, position: parseInt(pos, 10) }).then(({ objectPath }) => {
      const itemRef = itemPathToItemRef(hasSubregisters ?? false, objectPath);
      if (itemRef && selectedItem?.itemID !== itemRef.itemID) {
        onSelectItem(itemRef);
      }
    });
  }

  const extraData: RegisterItemGridData = {
    useObjectPathFromFilteredIndex,
    selectedItemID: selectedItem?.itemID,
    indexID,
    hasSubregisters: hasSubregisters ?? false,
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
        selectItem: (pos) => {
          selectIndexPos(pos);
          if (pos) {
            selectItemByPosition(pos);
          } else {
            onSelectItem(null);
          }
        },
        openItem: async (itemRef) => onOpenItem(itemPathToItemRef(
          hasSubregisters ?? false,
          (await getObjectPathFromFilteredIndex({ indexID, position: parseInt(itemRef, 10) })).objectPath)),
        cellWidth: CELL_W_PX,
        cellHeight: CELL_H_PX,
        padding: CELL_PADDING,
      };
    } else {
      return null;
    }
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
          ? <SelectedRegisterItemSidebar
              itemRef={selectedItem}
              onTransformFilterCriteria={onTransformFilterCriteria} />
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


const SelectedRegisterItemSidebar: React.FC<{
  itemRef: InternalItemReference
  onTransformFilterCriteria?: (transformer: CriteriaTransformer) => void
  className?: string
}> = function ({ itemRef, onTransformFilterCriteria, className }) {
  const { usePersistentDatasetStateReducer } = useContext(DatasetContext);
  const { itemClasses, subregisters } = useContext(BrowserCtx);
  const Sidebar = useMemo(() => makeSidebar(usePersistentDatasetStateReducer!), []);

  return <Sidebar
    stateKey='selected-item'
    className={className}
    css={css`width: 280px; z-index: 1;`}
    representsSelection
    title="Selected reg. item"
    blocks={[{
      key: 'item-view',
      title: "Summary",
      content: <ItemSummary itemRef={itemRef} />,
    }, {
      key: 'class',
      title: "Classification",
      content: <ItemClass
        classID={itemRef.classID}
        onApplyCriteria={onTransformFilterCriteria
          ? () =>
            onTransformFilterCriteria(() => ({
              criteria: [{
                key: 'item-class',
                query: CRITERIA_CONFIGURATION['item-class'].toQuery({ classID: itemRef.classID }, { itemClasses, subregisters }),
              }],
              require: 'all',
            }))
          : undefined}
      />,
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
