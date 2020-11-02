/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { debounce } from 'throttle-debounce';

import log from 'electron-log';

import React, { useRef, useState, useEffect } from 'react';
import { css, jsx } from '@emotion/core';
import { FixedSizeList as List } from 'react-window';
import {
  Button, Callout, Classes, Colors, ControlGroup, HTMLSelect,
  InputGroup, IOptionProps, NonIdealState, Spinner, Tooltip,
} from '@blueprintjs/core';

import { PluginFC, PluginComponentProps } from '@riboseinc/paneron-extension-kit/types';
import {
  ItemClassConfiguration, RegisterItem, RegisterItemDataHook,
  RegistryItemViewProps,
  RegistryViewProps, RelatedItemClassConfiguration
} from '../types';
import { MainView } from './MainView';
import { BrowserCtx, _getRelatedClass } from './util';


export const RegisterItemBrowser: PluginFC<
  Pick<RegistryViewProps, 'useObjectData' | 'useObjectPaths' | 'itemClassConfiguration'> & {
  useRegisterItemData: RegisterItemDataHook
}> =
function ({ itemClassConfiguration, useObjectData, useObjectPaths, useRegisterItemData }) {
  const [selectedItem, selectItem] = useState<string | undefined>(undefined);
  const [selectedClass, selectClass] = useState<string | undefined>(undefined);

  const itemClasses = Object.keys(itemClassConfiguration);

  const jumpToItem = (classID: string, itemID: string) => {
    selectClass(classID);
    selectItem(itemID);
  }

  useEffect(() => {
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
      itemClasses={itemClassConfiguration}
      selectedClassID={selectedClass}
      onSelectClass={(newClass) => { selectClass(newClass); selectItem(undefined) }} />
  </div>;

  class ErrorBoundary extends React.Component<Record<never, never>, { error?: string }> {
    constructor(props: any) {
      super(props);
      this.state = { error: undefined };
    }
    componentDidCatch(error: Error, info: any) {
      log.error("Error rendering item details", error, info);
      this.setState({ error: `${error.name}: ${error.message}` });
    }
    render() {
      if (this.state.error !== undefined) {
        return <NonIdealState
          icon="heart-broken"
          title="Error rendering view"
          description={
            <>
              <p>
                This could be caused by invalid register&nbsp;item&nbsp;data&nbsp;format.
              </p>
              <Callout style={{ textAlign: 'left', transform: 'scale(0.9)' }} title="Technical details">
                <pre style={{ overflow: 'auto', paddingBottom: '1em' }}>
                  {this.state.error}
                </pre>
              </Callout>
            </>
          }
        />;
      }
      return this.props.children;
    }
  }

  return (
    <BrowserCtx.Provider value={{ jumpToItem }}>
      <MainView title={classSelector}>

        <ItemBrowser
          itemClasses={itemClassConfiguration}

          selectedClassID={selectedClass}
          selectedItem={selectedItem}

          onSelectItem={selectItem}
          useObjectData={useObjectData}
          useObjectPaths={useObjectPaths}
          useRegisterItemData={useRegisterItemData}
        />

        <ErrorBoundary>
          <ItemDetails
            useRegisterItemData={useRegisterItemData}
            getRelatedClass={_getRelatedClass(itemClassConfiguration)}
            itemClass={itemClassConfiguration[selectedClass]}
            itemID={selectedItem} />
        </ErrorBoundary>

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
    return { value: classID, label: classData.meta.description };
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
function ({ itemClasses, selectedItem, selectedClassID, onSelectItem, useObjectPaths, useRegisterItemData }) {

  const classConfig = itemClasses[selectedClassID] || { meta: { id: '__NONEXISTENT_CLASS' } };

  const pathPrefix = classConfig.meta.id;

  const objectPathsQuery = useObjectPaths({ pathPrefix });

  const registerItemQuery = objectPathsQuery.value.
    filter(path => path !== '.DS_Store').
    map(path => ({ [path.replace('.yaml', '')]: 'utf-8' as const })).
    reduce((prev, curr) => ({ ...prev, ...curr }), {})

  const items = useRegisterItemData(registerItemQuery);

  const getRelatedClass = _getRelatedClass(itemClasses);

  let el: JSX.Element;

  if (objectPathsQuery.isUpdating || items.isUpdating) {
    el = <NonIdealState icon={<Spinner />} />;
  } else {
    let orderedItems = Object.values(items.value);
    orderedItems.sort((a, b) => classConfig.itemSorter(a.data, b.data));

    el = (
      <ItemList
        items={orderedItems}
        classConfig={itemClasses[selectedClassID]}
        getRelatedClassConfig={getRelatedClass}
        selectedItem={selectedItem}
        onSelectItem={onSelectItem} />
    );
  }

  return (
    <div css={css`flex-shrink: 0; flex-basis: 300px; background: ${Colors.WHITE}`}>
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
}> = function ({ items, selectedItem, onSelectItem, classConfig, getRelatedClassConfig }) {

  const CONTAINER_PADDINGS = 0;
  const itemCount = items.length;

  const listContainer = useRef<HTMLDivElement>(null);
  const listEl = useRef<List>(null);
  const [listHeight, setListHeight] = useState<number>(CONTAINER_PADDINGS);

  useEffect(() => {
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
          getRelatedItemClassConfiguration={getRelatedClassConfig}
          itemData={item.data}
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


const ItemDetails: PluginFC<{
  itemClass: ItemClassConfiguration<any>
  useRegisterItemData: RegisterItemDataHook
  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration
  itemID?: string
}> = function ({ itemClass, itemID, getRelatedClass, useRegisterItemData }) {
  let details: JSX.Element;

  const itemPath = `${itemClass.meta.id}/${itemID}`;

  const itemResponse = useRegisterItemData({
    [itemPath]: 'utf-8' as const,
  });
  const item = (itemResponse.value?.[itemPath] || null) as (null | RegisterItem<any>);

  const ItemTitle = itemClass.views.listItemView;

  if (itemID === undefined) {
    return <NonIdealState title="No item is selected" />;

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

  function StyledTitle(props: PluginComponentProps & RegistryItemViewProps<any>) {
    const Component = itemResponse.isUpdating
      ? (props: { className?: string }) => <span className={props.className}><span className={Classes.SKELETON}>Loading…</span>&emsp;</span>
      : ItemTitle;

    return <Component
      css={css`
        margin-top: 1em; font-weight: bold; font-size: 110%;
        line-height: 1;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      `}
      {...props}
    />;
  }

  return (
    <div className={Classes.ELEVATION_1} css={css`flex: 1; display: flex; flex-flow: column nowrap; padding: 1rem;`}>
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
            flex: 1; overflow-y: auto; padding: 1rem; border-radius: .5rem; background: ${Colors.WHITE};
            position: relative;
          `}
          className={Classes.ELEVATION_3}>
        {details}
      </div>
    </div>
  );
};
