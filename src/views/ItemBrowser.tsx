/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { debounce } from 'throttle-debounce';

//import log from 'electron-log';

import React, { useRef, useState, useEffect, useContext } from 'react';
import { css, jsx } from '@emotion/core';
import { FixedSizeList as List } from 'react-window';
import {
  Button, /*Callout,*/ Classes, Colors, HTMLSelect,
  IOptionProps, NonIdealState, Spinner,
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ItemAction,
  ItemClassConfiguration, ItemClassConfigurationSet, RegisterItem, RegisterItemDataHook,
  RegistryViewProps, RelatedItemClassConfiguration
} from '../types';
import { MainView } from './MainView';
import { _getRelatedClass } from './util';
import { BrowserCtx } from './BrowserCtx';
import ItemDetails from './ItemDetails';


export const RegisterItemBrowser: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration'> & {
  availableClassIDs?: string[]
  selectedSubregisterID?: string
  useRegisterItemData: RegisterItemDataHook
  onSubregisterChange?: (newID: string | undefined) => void
  itemActions?: ItemAction[]
  className?: string
}> = function ({
  availableClassIDs,
  selectedSubregisterID,
  itemClassConfiguration,
  useRegisterItemData,
  onSubregisterChange,
  itemActions,
  className,
}) {

  const [selectedItem, selectItem] = useState<string | undefined>(undefined);
  const [selectedClass, selectClass] = useState<string | undefined>(undefined);

  const itemClasses = availableClassIDs ?? Object.keys(itemClassConfiguration);
  const classConfiguration: ItemClassConfigurationSet =
    itemClasses.reduce((o: typeof itemClassConfiguration, k: keyof typeof itemClassConfiguration) =>
    { o[k] = itemClassConfiguration[k]; return o; }, {});

  const jumpToItem = (classID: string, itemID: string, subregisterID?: string) => {
    if (itemClasses.indexOf(classID) >= 0) {
      onSubregisterChange ? onSubregisterChange(subregisterID) : void 0;
      selectClass(classID);
      selectItem(itemID);
    }
  }

  const getRelatedClass = _getRelatedClass(itemClassConfiguration);

  useEffect(() => {
    if ((selectedClass === undefined && itemClasses.length > 0) ||
        (selectedClass && itemClasses.indexOf(selectedClass) < 0)) {
      selectClass(itemClasses[0]);
    }
  }, [JSON.stringify(itemClasses)]);

  if (selectedClass === undefined) {
    return <NonIdealState title="Please select item class" />;
  }

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
    <BrowserCtx.Provider value={{ jumpToItem }}>
      <MainView wrapperClassName={className}>

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
            itemClasses={classConfiguration}
            selectedClassID={selectedClass}
            onSelectClass={(newClass) => { selectClass(newClass); selectItem(undefined) }} />

          <ItemBrowser
            css={css`flex: 1`}

            classID={selectedClass}
            selectedItem={selectedItem}
            selectedSubregisterID={selectedSubregisterID}
            getRelatedClassConfig={getRelatedClass}
            itemSorter={classConfiguration[selectedClass]?.itemSorter}

            onSelectItem={selectItem}
            useRegisterItemData={useRegisterItemData}
          />

        </div>

        {/*<ErrorBoundary>*/}
          <ItemDetails
            useRegisterItemData={useRegisterItemData}
            getRelatedClass={_getRelatedClass(itemClassConfiguration)}
            itemClass={itemClassConfiguration[selectedClass]}
            subregisterID={selectedSubregisterID}
            itemID={selectedItem}
            itemActions={itemActions}
          />
        {/*</ErrorBoundary>*/}

      </MainView>
    </BrowserCtx.Provider>
  );
};


const ItemClassSelector: React.FC<{
  itemClasses: RegistryViewProps["itemClassConfiguration"]
  selectedClassID: string | undefined
  onSelectClass: (classID: string) => void
  className?: string
}> = function ({
  itemClasses,
  selectedClassID,
  onSelectClass,
  className,
}) {

  const itemClassChoices: IOptionProps[] = Object.entries(itemClasses).
  map(([classID, classData]) => {
    return { value: classID, label: classData?.meta?.title ?? "Unknown class" };
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


export const ItemBrowser: React.FC<{
  selectedItem?: string
  onSelectItem: (item: string | undefined) => void
  classID: string
  selectedSubregisterID?: string
  itemSorter?: ItemClassConfiguration<any>["itemSorter"]

  useRegisterItemData: RegisterItemDataHook
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration

  style?: React.CSSProperties
  className?: string
}> = function ({
  selectedItem,
  onSelectItem,
  classID,
  selectedSubregisterID,
  itemSorter,
  useRegisterItemData,
  getRelatedClassConfig,
  style,
  className,
}) {

  const { useObjectPaths } = useContext(DatasetContext);

  const pathPrefix = selectedSubregisterID
    ? `subregisters/${selectedSubregisterID}/${classID}`
    : classID;

  const objectPathsQuery = useObjectPaths({ pathPrefix });

  const registerItemQuery = objectPathsQuery.value.
    filter(path => path !== '.DS_Store').
    map(path => ({ [path.replace('.yaml', '')]: 'utf-8' as const })).
    reduce((prev, curr) => ({ ...prev, ...curr }), {})

  const items = useRegisterItemData(registerItemQuery);

  let el: JSX.Element;

  if (objectPathsQuery.isUpdating || items.isUpdating) {
    el = <NonIdealState icon={<Spinner />} />;

  } else {
    // NOTE: On switching between classes/subregisters,
    // it could be that class configuration has updated,
    // but items.value still contains items of previous type. This isn’t great.
    const orderedItems = Object.values(items.value).sort(itemSorter
      ? getItemSorter(itemSorter)
      : defaultItemSorterFunc);

    el = (
      <ItemList
        items={orderedItems}
        useRegisterItemData={useRegisterItemData}
        subregisterID={selectedSubregisterID}
        classID={classID}
        getRelatedClassConfig={getRelatedClassConfig}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem} />
    );
  }

  return (
    <div className={className} style={style}>
      {el}
    </div>
  );
};


const ItemList: React.FC<{
  items: RegisterItem<any>[]
  classID: string
  subregisterID?: string
  useRegisterItemData: RegisterItemDataHook
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration
  selectedItem?: string
  onSelectItem: (item: string | undefined) => void
}> = function ({
  items,
  classID,
  selectedItem,
  subregisterID,
  onSelectItem,
  useRegisterItemData,
  getRelatedClassConfig,
}) {

  const CONTAINER_PADDINGS = 0;
  const itemCount = items.length;

  const listContainer = useRef<HTMLDivElement>(null);
  const listEl = useRef<List>(null);
  const [listHeight, setListHeight] = useState<number>(CONTAINER_PADDINGS);

  useEffect(() => {
    const updateListHeight = debounce(100, () => {
      setListHeight(listContainer.current?.parentElement?.offsetHeight ?? CONTAINER_PADDINGS);
      setImmediate(() => {
        if (selectedItem !== undefined) {
          scrollTo(selectedItem)
        }
      });
    });

    window.addEventListener('resize', updateListHeight);
    updateListHeight();

    return function cleanup() {
      window.removeEventListener('resize', updateListHeight);
    }
  }, [listContainer.current]);

  const ItemView = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const item = items[index];

    if (!item) {
      return <Button
        minimal fill style={style} alignText="left"
        css={css`white-space: nowrap; font-size: 90%;
                  & > .bp3-button-text { overflow: hidden; text-overflow: ellipsis }`}
        onClick={handleClick}>Loading…</Button>;
    }

    function handleClick(evt: React.MouseEvent) {
      if ((evt.target as Element).nodeName === 'INPUT') {
        evt.stopPropagation();
      } else {
        setImmediate(() => onSelectItem(item.id));
      }
    }

    const View = getRelatedClassConfig(classID).itemView;

    return (
      <Button
          active={item.id === selectedItem}
          minimal fill style={style} alignText="left"
          css={css`white-space: nowrap; font-size: 90%;
                    & > .bp3-button-text { overflow: hidden; text-overflow: ellipsis }`}
          onClick={handleClick}>
        <View
          getRelatedItemClassConfiguration={getRelatedClassConfig}
          useRegisterItemData={useRegisterItemData}
          subregisterID={subregisterID}
          itemData={item.data}
          itemID={item.id}
          css={css`white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`}
        />
      </Button>
    );
  };

  function scrollTo(itemID: string) {
    if (listEl && listEl.current) {
      listEl.current.scrollToItem(
        items.findIndex(i => i.id === itemID),
        'smart');
    }
  }

  return (
    <div ref={listContainer}>
      <List
          ref={listEl}
          itemCount={itemCount}
          width="100%"
          height={listHeight - CONTAINER_PADDINGS}
          itemSize={ITEM_HEIGHT}>
        {ItemView}
      </List>
    </div>
  );
};
const ITEM_HEIGHT = 30;


function getItemSorter(sorterFunc?: ItemClassConfiguration<any>["itemSorter"]):
ItemClassConfiguration<any>["itemSorter"] {
  if (sorterFunc !== undefined) {
    return function (a, b) {
      if (a.data && b.data) {
        try {
          return sorterFunc(a.data, b.data)
        } catch (e) {
          // Error sorting items. Could happen if items
          // are not of the type expected by the sorter.
          // log.error("Error sorting items", a.data, b.data);
          return 0;
        }
      } else {
        return defaultItemSorterFunc();
      }
    }
  } {
    return defaultItemSorterFunc;
  }
}

const defaultItemSorterFunc = () => 0;
