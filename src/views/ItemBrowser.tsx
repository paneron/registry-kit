/** @jsx jsx */
/** @jsxFrag React.Fragment */

import styled from '@emotion/styled';
import { css, jsx } from '@emotion/core';
import React, { useRef, useState, useEffect, useContext } from 'react';

import { debounce } from 'throttle-debounce';
import { FixedSizeList as List } from 'react-window';

import {
  Button, /*Callout,*/ Classes, Colors, ControlGroup, HTMLSelect,
  InputGroup, IOptionProps, NonIdealState, Spinner, Tooltip, UL,
} from '@blueprintjs/core';

import ErrorState from '@riboseinc/paneron-extension-kit/widgets/ErrorState';
import { progressToValue } from '@riboseinc/paneron-extension-kit/util';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ItemClassConfiguration,
  ItemClassConfigurationSet,
  RegisterItem,
  RegisterItemDataHook,
  RegistryItemViewProps,
  RelatedItemClassConfiguration,
} from '../types';

import { MainView } from './MainView';
import { BrowserCtx, _getRelatedClass } from './util';


export const RegisterItemBrowser: React.FC<{
  itemClassConfiguration: ItemClassConfigurationSet
  availableClassIDs?: string[]
  selectedSubregisterID?: string
  useRegisterItemData: RegisterItemDataHook
  onSubregisterChange?: (newiD: string | undefined) => void
}> = function ({
  availableClassIDs,
  selectedSubregisterID,
  itemClassConfiguration,
  useRegisterItemData,
  onSubregisterChange,
}) {

  const [selectedItem, selectItem] = useState<string | undefined>(undefined);
  const [selectedClass, selectClass] = useState<string | undefined>(undefined);

  const itemClasses = availableClassIDs || Object.keys(itemClassConfiguration);

  const jumpToItem = (classID: string, itemID: string, subregisterID?: string) => {
    onSubregisterChange ? onSubregisterChange(subregisterID) : void 0;
    selectClass(classID);
    selectItem(itemID);
  }

  useEffect(() => {
    if ((selectedClass === undefined && itemClasses.length > 0) ||
        (selectedClass && itemClasses.indexOf(selectedClass) < 0)) {
      selectClass(itemClasses[0]);
    }
  }, [JSON.stringify(itemClasses)]);

  useEffect(() => {
    selectItem(undefined);
  }, [selectedSubregisterID]);

  if (selectedClass === undefined) {
    return <NonIdealState title="Please select item class" />;
  }

  const browserContextValue: BrowserCtx = {
    jumpToItem,
    item: {
      selected: selectedItem,
      select: selectItem,
    },
    itemClass: {
      selected: selectedClass,
      select: selectClass,
    },
    subregister: {
      selected: selectedSubregisterID,
      select: onSubregisterChange,
    },
    availableItemClasses: itemClasses,
    itemClassConfiguration: itemClassConfiguration,
    getRelatedClass: _getRelatedClass(itemClassConfiguration),
  };

  //class ErrorBoundary extends React.Component<Record<never, never>, { error?: string }> {
  //  constructor(props: any) {
  //    super(props);
  //    this.state = { error: undefined };
  //  }
  //  componentDidCatch(error: Error, info: any) {
  //    log.error("Error rendering item details", error, info);
  //    this.setState({ error: `${error.name}: ${error.message}` });
  //  }
  //  render() {
  //    if (this.state.error !== undefined) {
  //      return <NonIdealState
  //        icon="heart-broken"
  //        title="Error rendering view"
  //        description={
  //          <>
  //            <p>
  //              This could be caused by invalid register&nbsp;item&nbsp;data&nbsp;format.
  //            </p>
  //            <Callout style={{ textAlign: 'left', transform: 'scale(0.9)' }} title="Technical details">
  //              <pre style={{ overflow: 'auto', paddingBottom: '1em' }}>
  //                {this.state.error}
  //              </pre>
  //            </Callout>
  //          </>
  //        }
  //      />;
  //    }
  //    return this.props.children;
  //  }
  //}

  return (
    <BrowserCtx.Provider value={browserContextValue}>
      <MainView>

        <div
            className={Classes.ELEVATION_1}
            css={css`
              flex-shrink: 0;
              flex-basis: 300px;
              display: flex;
              flex-flow: column nowrap;
              background: ${Colors.WHITE};
            `}>

          <ItemClassSelector
            css={css`select { font-weight: bold; }`}
            onSelectClass={(newClass) => { selectClass(newClass); selectItem(undefined) }} />

          <ItemBrowser
            css={css`flex: 1`}
          />

        </div>

        {/*<ErrorBoundary>*/}
          <ItemDetails
            useRegisterItemData={useRegisterItemData}
          />
        {/*</ErrorBoundary>*/}

      </MainView>
    </BrowserCtx.Provider>
  );
};


const ItemClassSelector: React.FC<{
  onSelectClass: (classID: string) => void
  className?: string
}> = function ({
  onSelectClass,
  className,
}) {
  const { itemClassConfiguration: itemClasses, itemClass } = useContext(BrowserCtx);
  const selectedClassID = itemClass.selected;

  const itemClassChoices: IOptionProps[] = Object.entries(itemClasses).
  map(([classID, classData]) => {
    return { value: classID, label: classData.meta.title };
  });

  return (
    <HTMLSelect
      className={className}
      fill
      minimal
      options={itemClassChoices}
      value={selectedClassID}
      onChange={(evt) => onSelectClass(evt.currentTarget.value)} />
  );
};


const ItemBrowser: React.FC<{
  className?: string
}> = function ({
  className,
}) {

  const { useFilteredIndex, useIndexDescription } = useContext(DatasetContext);

  const { itemClassConfiguration: itemClasses, item, itemClass, subregister } = useContext(BrowserCtx);
  const selectedItem = item.selected;
  const onSelectItem = item.select;
  const selectedClassID = itemClass.selected;
  const selectedSubregisterID = subregister.selected;

  const classConfig: ItemClassConfiguration<any> | undefined = selectedClassID
    ? itemClasses[selectedClassID]
    : undefined;

  const pathPrefix = classConfig
    ? selectedSubregisterID
      ? `subregisters/${selectedSubregisterID}/${classConfig.meta.id}`
      : classConfig.meta.id
    : undefined;

  const queryExpression = pathPrefix ? `return objectPath.startsWith("${pathPrefix}")` : `return false`;
  const filteredIndex = useFilteredIndex({ queryExpression });
  const indexDescription = useIndexDescription({ indexID: filteredIndex.value.indexID });
  const indexStatus = indexDescription.value.status;
  const itemCount = indexStatus.objectCount;

  const getRelatedClass = _getRelatedClass(itemClasses);

  let el: JSX.Element;

  const userErrors = [
    ...filteredIndex.errors,
    ...indexDescription.errors,
  ];

  if (classConfig === undefined) {
    el = <NonIdealState title="No class is selected" />;

  } else if (userErrors.length > 0) {
    el = <ErrorState
      viewName="register item browser"
      error={userErrors[0]}
      technicalDetails={<>
        There were errors building or retrieving dataset index:
        <UL>
          {userErrors.slice(1, userErrors.length).map(e => <li>{e.name}: {e.message}</li>)}
        </UL>
      </>}
    />;

  } else if (indexStatus.progress || filteredIndex.value.indexID === undefined) {
    const progressValue = indexStatus.progress
      ? progressToValue(indexStatus.progress)
      : undefined;
    const spinner = <Spinner
      value={progressValue} />;

    el = <NonIdealState
      icon={spinner}
      description={indexStatus.progress?.phase} />;

  } else {
    el = (
      <ItemList
        indexID={filteredIndex.value.indexID}
        itemCount={itemCount}
        classConfig={classConfig}
        getRelatedClassConfig={getRelatedClass}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem} />
    );
  }

  return (
    <div className={className}>
      {el}
    </div>
  );
};


const FilteredItem: React.FC<{
  indexID: string
  position: number
  selectedObjectPath?: string
  style: React.CSSProperties | undefined
  onSelect: (objectPath: string) => void
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration
  ItemView: React.FC<RegistryItemViewProps<any> & { itemID: string }>
}> = function ({ indexID, position, selectedObjectPath, onSelect, style, ItemView, getRelatedClassConfig }) {
  const { useObjectPathFromFilteredIndex, useObjectData } = useContext(DatasetContext);

  const objectPath = useObjectPathFromFilteredIndex({
    indexID,
    position,
  });

  const itemData = useObjectData({
    objectPaths: objectPath.value.objectPath !== ''
      ? [objectPath.value.objectPath]
      : [],
  });

  const isLoaded: boolean = objectPath.isUpdating || itemData.isUpdating;
  const isSelected: boolean = isLoaded && objectPath.value.objectPath === selectedObjectPath;

  function handleClick(evt: React.MouseEvent) {
    if ((evt.target as Element).nodeName === 'INPUT') {
      evt.stopPropagation();
    } else if (isLoaded) {
      setImmediate(() => onSelect(objectPath.value.objectPath));
    }
  }

  return (
    <ItemContainer
        active={isSelected}
        minimal fill style={style}
        alignText="left"
        onClick={handleClick}>
      <ItemView
        itemID={objectPath.value.objectPath}
        itemData={itemData}
        getRelatedItemClassConfiguration={getRelatedClassConfig}
      />
    </ItemContainer>
  );
}


const ItemList: React.FC<{
  itemCount: number
  indexID: string
  classConfig: ItemClassConfiguration<any>
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration
  selectedItem?: string
  onSelectItem: (item: string | undefined) => void
}> = function ({
  itemCount,
  indexID,
  selectedItem,
  classConfig,
  onSelectItem,
  getRelatedClassConfig,
}) {
  const CONTAINER_PADDINGS = 0;

  const listContainer = useRef<HTMLDivElement>(null);
  const listEl = useRef<List>(null);
  const [listHeight, setListHeight] = useState<number>(CONTAINER_PADDINGS);

  const ItemView = classConfig.views.listItemView;

  //const selectedItemPosition: number | undefined =
  //  useItemPositionInFilteredIndex({ indexID, selectedItem }).value.position;

  //useEffect(() => {
  //  scrollToSelectedItemPosition();
  //}, [selectedItemPosition]);

  // function scrollToSelectedItemPosition() {
  //   if (listEl && listEl.current && selectedItemPosition) {
  //     listEl.current.scrollToItem(selectedItemPosition, 'smart');
  //   }
  // }

  useEffect(() => {
    const updateListHeight = debounce(100, () => {
      setListHeight(listContainer.current?.parentElement?.offsetHeight || CONTAINER_PADDINGS);
      //setImmediate(scrollToSelectedItemPosition);
    });

    window.addEventListener('resize', updateListHeight);
    updateListHeight();

    return function cleanup() {
      window.removeEventListener('resize', updateListHeight);
    }
  }, [listContainer.current]);

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    return (
      <FilteredItem
        getRelatedClassConfig={getRelatedClassConfig}
        onSelect={(itemID) => onSelectItem(itemID)}
        selectedObjectPath={selectedItem}
        ItemView={ItemView}
        style={style}
        indexID={indexID}
        position={index}
        css={css`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}
      />
    );
  };

  return (
    <div ref={listContainer}>
      <List
          ref={listEl}
          itemCount={itemCount}
          width="100%"
          height={listHeight - CONTAINER_PADDINGS}
          itemSize={ITEM_HEIGHT}>
        {Row}
      </List>
    </div>
  );
};
const ITEM_HEIGHT = 30;


const ItemContainer = styled(Button)`
  white-space: nowrap; font-size: 90%;
  & > .bp3-button-text { overflow: hidden; text-overflow: ellipsis }
  border-radius: 0;
`;


const ItemDetails: React.FC<{
  useRegisterItemData: RegisterItemDataHook
}> = function ({ useRegisterItemData }) {
  let details: JSX.Element;

  const { itemClassConfiguration, itemClass: _itemClass, subregister, item: _item, getRelatedClass } = useContext(BrowserCtx);

  const itemID = _item.selected;
  const subregisterID = subregister.selected;

  const itemClass: ItemClassConfiguration<any> | undefined = _itemClass.selected
    ? itemClassConfiguration[_itemClass.selected]
    : undefined;

  //const itemPath = `${itemClass.meta.id}/${itemID}`;
  const _itemPath = itemClass
    ? `${itemClass.meta.id}/${itemID}`
    : undefined;

  const itemPath = _itemPath && subregisterID
    ? `subregisters/${subregisterID}/${_itemPath}`
    : _itemPath;

  const itemResponse = useRegisterItemData({
    itemPaths: itemPath ? [itemPath] : [],
  });

  const item = itemPath
    ? (itemResponse.value?.[itemPath] || null) as (null | RegisterItem<any>)
    : null;

  if (itemID === undefined) {
    return <NonIdealState title="No item is selected" />;

  } else if (itemClass === undefined) {
    return <NonIdealState icon="heart-broken" title="No item class is selected" />;

  } else if (itemResponse.isUpdating) {
    details = <div className={Classes.SKELETON}>Loading…</div>;

  } else if (item) {
    const DetailView = itemClass.views.detailView;

    details = (
      <DetailView
        getRelatedItemClassConfiguration={getRelatedClass}
        useRegisterItemData={useRegisterItemData}
        itemData={item.data}
      />
    );

  } else {
    details = <NonIdealState title="Item data not available" />;
  }

  const ItemTitle = itemClass.views.listItemView;

  function StyledTitle(props: RegistryItemViewProps<any>) {
    const Component = itemResponse.isUpdating || !itemID
      ? (props: { className?: string }) =>
          <span className={props.className}>
            <span className={Classes.SKELETON}>Loading…</span>
            &emsp;
          </span>
      : ItemTitle;

    return <Component
      css={css`
        margin-top: 1em; font-weight: bold; font-size: 110%;
        line-height: 1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      `}
      itemID={itemID!}
      {...props}
    />;
  }

  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; padding: 1rem; overflow: hidden;`}>
      {itemID
        ? <div css={css`flex-shrink: 0; margin-bottom: 1rem; display: flex; flex-flow: column nowrap;`}>
            <ControlGroup>
              <Tooltip content="Internal unique item ID">
                <InputGroup disabled value={item?.id || itemID || ''} fill />
              </Tooltip>
              <Button
                  disabled
                  intent={item?.status === 'valid' ? 'success' : undefined}
                  title="Item status"
                  icon={item?.status === 'valid' ? 'tick-circle' : 'blank'}>
                {item?.status || 'unknown status'}
              </Button>
              <InputGroup
                disabled
                leftIcon="calendar"
                value={`acceped ${item?.dateAccepted?.toLocaleDateString() || '—'}`}
              />
            </ControlGroup>
            <StyledTitle
              itemData={item?.data || {}}
              getRelatedItemClassConfiguration={getRelatedClass} />
          </div>
        : null}

      <div
          css={css`
            flex: 1; overflow-y: auto; padding: 1rem;
            border-radius: .5rem; background: ${Colors.WHITE};
            position: relative;
          `}
          className={Classes.ELEVATION_3}>
        {details}
      </div>
    </div>
  );
};


// function getItemSorter(sorterFunc?: ItemClassConfiguration<any>["itemSorter"]):
// ItemClassConfiguration<any>["itemSorter"] {
//   if (sorterFunc !== undefined) {
//     return function (a, b) {
//       if (a.data && b.data) {
//         try {
//           return sorterFunc(a.data, b.data)
//         } catch (e) {
//           // Error sorting items. Could happen if items
//           // are not of the type expected by the sorter.
//           // log.error("Error sorting items", a.data, b.data);
//           return 0;
//         }
//       } else {
//         return defaultItemSorterFunc();
//       }
//     }
//   } {
//     return defaultItemSorterFunc;
//   }
// }
// 
// const defaultItemSorterFunc = () => 0;
