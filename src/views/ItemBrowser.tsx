/** @jsx jsx */

//import log from 'electron-log';
import { debounce } from 'throttle-debounce';

import { FixedSizeList as List } from 'react-window';
import { css, jsx } from '@emotion/core';
import { Button, Classes, Colors, HTMLSelect, IOptionProps, NonIdealState } from '@blueprintjs/core';

import { PluginFC } from '@riboseinc/paneron-extension-kit/types';
import {
  ItemClassConfiguration, RegisterItem, RegisterItemDataHook,
  RegistryViewProps, RelatedItemClassConfiguration
} from '../types';
import { MainView } from './MainView';
import { _getRelatedClass } from './util';


export const RegisterItemBrowser: PluginFC<
  Pick<RegistryViewProps, 'useObjectData' | 'useObjectPaths' | 'itemClassConfiguration'> & {
  useRegisterItemData: RegisterItemDataHook
}> =
function ({ React, itemClassConfiguration, useObjectData, useObjectPaths, useRegisterItemData }) {
  const [selectedItem, selectItem] = React.useState<string | undefined>(undefined);
  const [selectedClass, selectClass] = React.useState<string | undefined>(undefined);

  const itemClasses = Object.keys(itemClassConfiguration);

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

  const pathPrefix = itemClasses[selectedClassID].meta.id || '_NONEXISTENT_CLASS';

  const objectPaths = useObjectPaths({
    pathPrefix,
  }).value;

  const registerItemQuery = objectPaths.
    filter(path => path !== '.DS_Store').
    map(path => ({ [path.replace('.yaml', '')]: 'utf-8' as const })).
    reduce((prev, curr) => ({ ...prev, ...curr }), {})

  const items = useRegisterItemData(registerItemQuery);

  const getRelatedClass = _getRelatedClass(itemClasses);

  return (
    <div css={css`flex-shrink: 0; flex-basis: 30vw; background: ${Colors.WHITE}`}>
      <ItemList
        React={React}
        items={Object.values(items.value)}
        classConfig={itemClasses[selectedClassID]}
        getRelatedClassConfig={getRelatedClass}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem} />
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


const ItemDetails: PluginFC<{
  itemClass: ItemClassConfiguration<any>
  useRegisterItemData: RegisterItemDataHook
  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration
  itemID?: string
}> = function ({ React, itemClass, itemID, getRelatedClass, useRegisterItemData }) {
  let el: JSX.Element

  const itemPath = `${itemClass.meta.id}/${itemID}`;

  const item = useRegisterItemData({
    [itemPath]: 'utf-8' as const,
  }).value?.[itemPath];

  if (itemID === undefined) {
    el = <NonIdealState title="No item is selected" />;

  } else if (item) {
    const View = itemClass.views.detailView;
    el = (
      <View
        React={React}
        getRelatedItemClassConfiguration={getRelatedClass}
        useRegisterItemData={useRegisterItemData}
        itemData={item.data}
      />
    );

  } else {
    el = <NonIdealState title="Item data not available" />;
  }

  return (
    <div className={Classes.ELEVATION_1} css={css`flex: 1; display: flex; flex-flow: column nowrap; padding: 1rem;`}>
      {item
        ? <div css={css`flex-shrink: 0; margin-bottom: 1rem; display: flex; flex-flow: column nowrap;`}>
            <small css={css`overflow: hidden; text-overflow: ellipsis`}>{item?.id}</small>
            <div>
              Status: {item?.status || '—'}&emsp;•&emsp;Acceped on {item?.dateAccepted?.toLocaleDateString() || '—'}
            </div>
          </div>
        : null}

      <div
          css={css`flex: 1; overflow-y: auto; padding: 1rem; border-radius: .5rem; background: ${Colors.WHITE}`}
          className={Classes.ELEVATION_3}>
        {el}
      </div>
    </div>
  );
};
