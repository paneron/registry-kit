/** @jsx jsx */

import { debounce } from 'throttle-debounce';

import log from 'electron-log';

import React from 'react';
import { css, jsx } from '@emotion/core';
import { FixedSizeList as List } from 'react-window';
import { Button, Classes, Colors, ControlGroup, HTMLSelect, InputGroup, IOptionProps, NonIdealState, Spinner, Tooltip } from '@blueprintjs/core';

import { PluginFC } from '@riboseinc/paneron-extension-kit/types';
import {
  GenericRelatedItemViewProps,
  ItemClassConfiguration, RegisterItem, RegisterItemDataHook,
  RegistryViewProps, RelatedItemClassConfiguration
} from '../types';
import { MainView } from './MainView';
import { _getRelatedClass } from './util';


type BrowserCtx = { jumpToItem: (classID: string, itemID: string) => void }
const BrowserCtx = React.createContext<BrowserCtx>({ jumpToItem: () => {} });


export const RegisterItemBrowser: PluginFC<
  Pick<RegistryViewProps, 'useObjectData' | 'useObjectPaths' | 'itemClassConfiguration'> & {
  useRegisterItemData: RegisterItemDataHook
}> =
function ({ React, itemClassConfiguration, useObjectData, useObjectPaths, useRegisterItemData }) {
  const [selectedItem, selectItem] = React.useState<string | undefined>(undefined);
  const [selectedClass, selectClass] = React.useState<string | undefined>(undefined);

  const itemClasses = Object.keys(itemClassConfiguration);

  const jumpToItem = (classID: string, itemID: string) => {
    selectClass(classID);
    selectItem(itemID);
  }

  React.useEffect(() => {
    if (selectedClass === undefined && itemClasses.length > 0) {
      selectClass(itemClasses[0]);
    }
  }, [itemClasses.length]);

  if (selectedClass === undefined) {
    return <NonIdealState title="Please select item class" />;
  }

  const classSelector = <div css={css`display: flex; flex-flow: row nowrap; align-items: center; white-space: nowrap;`}>
    Item class
    &emsp;
    <ItemClassSelector
      React={React}
      itemClasses={itemClassConfiguration}
      selectedClassID={selectedClass}
      onSelectClass={selectClass} />
  </div>;

  return (
    <BrowserCtx.Provider value={{ jumpToItem }}>
      <MainView React={React} title={classSelector}>

        <ItemBrowser
          React={React}
          itemClasses={itemClassConfiguration}

          selectedClassID={selectedClass}
          selectedItem={selectedItem}

          onSelectItem={selectItem}
          useObjectData={useObjectData}
          useObjectPaths={useObjectPaths}
          useRegisterItemData={useRegisterItemData}
        />

        <ItemDetails
          React={React}
          useRegisterItemData={useRegisterItemData}
          getRelatedClass={_getRelatedClass(itemClassConfiguration)}
          itemClass={itemClassConfiguration[selectedClass]}
          itemID={selectedItem} />

      </MainView>
    </BrowserCtx.Provider>
  );
};



const ItemClassSelector: PluginFC<{
  itemClasses: RegistryViewProps["itemClassConfiguration"]
  selectedClassID: string | undefined
  onSelectClass: (classID: string) => void
}> = function ({ itemClasses, selectedClassID, onSelectClass }) {

  const itemClassChoices: IOptionProps[] = Object.entries(itemClasses).
  map(([classID, classData]) => {
    return { value: classID, label: classData.meta.title };
  });

  return (
    <HTMLSelect
      fill
      minimal
      options={itemClassChoices}
      value={selectedClassID}
      onChange={(evt) => onSelectClass(evt.currentTarget.value)} />
  );
};


const ItemBrowser: PluginFC<{
  selectedItem?: string
  selectedClassID: string

  itemClasses: RegistryViewProps["itemClassConfiguration"]

  useRegisterItemData: RegisterItemDataHook
  useObjectPaths: RegistryViewProps["useObjectPaths"]
  useObjectData: RegistryViewProps["useObjectData"]
  onSelectItem: (item: string | undefined) => void
}> =
function ({ React, itemClasses, selectedItem, selectedClassID, onSelectItem, useObjectPaths, useRegisterItemData }) {

  const classConfig = itemClasses[selectedClassID] || { meta: { id: '__NONEXISTENT_CLASS' } };

  const pathPrefix = classConfig.meta.id;

  const objectPaths = useObjectPaths({
    pathPrefix,
  }).value;

  const registerItemQuery = objectPaths.
    filter(path => path !== '.DS_Store').
    map(path => ({ [path.replace('.yaml', '')]: 'utf-8' as const })).
    reduce((prev, curr) => ({ ...prev, ...curr }), {})

  const items = useRegisterItemData(registerItemQuery);

  const getRelatedClass = _getRelatedClass(itemClasses);

  let el: JSX.Element;

  if (items.isUpdating) {
    el = <NonIdealState icon={<Spinner />} />;
  } else {
    let orderedItems = Object.values(items.value);
    orderedItems.sort((a, b) => classConfig.itemSorter(a.data, b.data));

    el = (
      <ItemList
        React={React}
        items={orderedItems}
        classConfig={itemClasses[selectedClassID]}
        getRelatedClassConfig={getRelatedClass}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem} />
    );
  }

  return (
    <div css={css`flex-shrink: 0; flex-basis: 30vw; background: ${Colors.WHITE}`}>
      {el}
    </div>
  );
};


const ItemList: PluginFC<{
  items: RegisterItem<any>[]
  classConfig: ItemClassConfiguration<any>
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration
  selectedItem?: string
  onSelectItem: (item: string | undefined) => void
}> = function ({ React, items, selectedItem, onSelectItem, classConfig, getRelatedClassConfig }) {

  const CONTAINER_PADDINGS = 0;
  const itemCount = items.length;

  const listContainer = React.useRef<HTMLDivElement>(null);
  const listEl = React.useRef<List>(null);
  const [listHeight, setListHeight] = React.useState<number>(CONTAINER_PADDINGS);

  React.useEffect(() => {
    const updateListHeight = debounce(100, () => {
      setListHeight(listContainer.current?.parentElement?.offsetHeight || CONTAINER_PADDINGS);
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

    function handleClick(evt: React.MouseEvent) {
      if ((evt.target as Element).nodeName === 'INPUT') {
        evt.stopPropagation();
      } else {
        setImmediate(() => onSelectItem(item.id));
      }
    }

    const View = classConfig.views.listItemView;

    return (
      <Button
          active={item.id === selectedItem}
          minimal fill style={style} alignText="left"
          css={css`white-space: nowrap; font-size: 90%;
                    & > .bp3-button-text { overflow: hidden; text-overflow: ellipsis }`}
          onClick={handleClick}>
        <View
          React={React}
          getRelatedItemClassConfiguration={getRelatedClassConfig}
          itemData={item.data}
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


export const GenericRelatedItemView: PluginFC<GenericRelatedItemViewProps> = function ({
  React, itemRef, className,
  useRegisterItemData, getRelatedItemClassConfiguration,
}) {
  const { classID, itemID } = itemRef;
  const itemPath = `${classID}/${itemID}`;

  log.debug("Rendering generic related item view", itemRef);

  const browserCtx: BrowserCtx = React.useContext(BrowserCtx);

  const itemResult = useRegisterItemData({
    [itemPath]: 'utf-8' as const,
  });
  const item = (itemResult.value?.[itemPath] || null) as RegisterItem<any> | null;

  let classConfigured: boolean
  let cfg: RelatedItemClassConfiguration
  try {
    cfg = getRelatedItemClassConfiguration(itemRef.classID);
    classConfigured = true;
  } catch (e) {
    cfg = {
      title: itemRef.classID,
      itemView: () => <span>{itemID}</span>
    }
    classConfigured = false;
  }

  const Item = cfg.itemView;

  log.debug("Rendering generic related item view: got item", item);

  return (
    <ControlGroup className={className}>
      <Button disabled>{cfg.title}</Button>
      <Button
          loading={itemResult.isUpdating}
          icon={item === null ? 'error' : 'locate'}
          disabled={item === null || !browserCtx.jumpToItem || !classConfigured}
          onClick={() => browserCtx.jumpToItem(classID, itemID)}>
        {item !== null && !itemResult.isUpdating
          ? <Item
              React={React}
              itemData={item.data}
              getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
            />
          : <span>Item not found: {itemRef.itemID}</span>}
      </Button>
    </ControlGroup>
  );
};


const ItemDetails: PluginFC<{
  itemClass: ItemClassConfiguration<any>
  useRegisterItemData: RegisterItemDataHook
  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration
  itemID?: string
}> = function ({ React, itemClass, itemID, getRelatedClass, useRegisterItemData }) {
  let details: JSX.Element

  const itemPath = `${itemClass.meta.id}/${itemID}`;

  const item = (useRegisterItemData({
    [itemPath]: 'utf-8' as const,
  }).value?.[itemPath] || null) as (null | RegisterItem<any>);

  const ItemTitle = itemClass.views.listItemView;

  if (itemID === undefined) {
    details = <NonIdealState title="No item is selected" />;

  } else if (item) {
    const DetailView = itemClass.views.detailView;

    details = (
      <DetailView
        React={React}
        GenericRelatedItemView={GenericRelatedItemView}
        getRelatedItemClassConfiguration={getRelatedClass}
        useRegisterItemData={useRegisterItemData}
        itemData={item.data}
      />
    );

  } else {
    details = <NonIdealState title="Item data not available" />;
  }

  return (
    <div className={Classes.ELEVATION_1} css={css`flex: 1; display: flex; flex-flow: column nowrap; padding: 1rem;`}>
      {item
        ? <div css={css`flex-shrink: 0; margin-bottom: 1rem; display: flex; flex-flow: column nowrap;`}>
            <ControlGroup>
              <Tooltip content="Internal unique item ID">
                <InputGroup disabled value={item?.id || ''} fill />
              </Tooltip>
              <Button
                  disabled
                  intent={item.status === 'valid' ? 'success' : undefined}
                  title="Item status"
                  icon={item.status === 'valid' ? 'tick-circle' : 'blank'}>
                {item.status || 'unknown status'}
              </Button>
              <InputGroup
                disabled
                leftIcon="calendar"
                value={`acceped ${item.dateAccepted?.toLocaleDateString() || '—'}`}
              />
            </ControlGroup>
            <ItemTitle
              React={React}
              itemData={item.data}
              getRelatedItemClassConfiguration={getRelatedClass}
              css={css`margin-top: 1em; font-weight: bold; font-size: 110%;`} />
          </div>
        : null}

      <div
          css={css`flex: 1; overflow-y: auto; padding: 1rem; border-radius: .5rem; background: ${Colors.WHITE}`}
          className={Classes.ELEVATION_3}>
        {details}
      </div>
    </div>
  );
};
