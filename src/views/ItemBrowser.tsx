/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { debounce } from 'throttle-debounce';

//import log from 'electron-log';

import React, { useRef, useState, useEffect, useContext } from 'react';
import { css, jsx } from '@emotion/core';
import { FixedSizeList as List } from 'react-window';
import {
  Button, /*Callout,*/ Classes, Colors, ControlGroup, HTMLSelect,
  InputGroup, IOptionProps, NonIdealState, Spinner, Tooltip,
} from '@blueprintjs/core';

import { ExtensionViewContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ItemClassConfiguration, ItemClassConfigurationSet, RegisterItem, RegisterItemDataHook,
  RegistryItemViewProps,
  RegistryViewProps, RelatedItemClassConfiguration
} from '../types';
import { MainView } from './MainView';
import { BrowserCtx, _getRelatedClass } from './util';


export const RegisterItemBrowser: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration'> & {
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
  const classConfiguration: ItemClassConfigurationSet =
    itemClasses.reduce((o: typeof itemClassConfiguration, k: keyof typeof itemClassConfiguration) =>
    { o[k] = itemClassConfiguration[k]; return o; }, {});

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
            itemClasses={classConfiguration}
            selectedClassID={selectedClass}
            onSelectClass={(newClass) => { selectClass(newClass); selectItem(undefined) }} />

          <ItemBrowser
            css={css`flex: 1`}
            itemClasses={itemClassConfiguration}

            selectedItem={selectedItem}
            selectedClassID={selectedClass}
            selectedSubregisterID={selectedSubregisterID}

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
    return { value: classID, label: classData.meta.description };
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
  selectedItem?: string
  onSelectItem: (item: string | undefined) => void

  itemClasses: RegistryViewProps["itemClassConfiguration"]
  selectedClassID: string

  selectedSubregisterID?: string

  useRegisterItemData: RegisterItemDataHook

  className?: string
}> = function ({
  itemClasses,
  selectedItem,
  selectedClassID,
  selectedSubregisterID,
  onSelectItem,
  useRegisterItemData,
  className,
}) {

  const { useObjectPaths } = useContext(ExtensionViewContext);

  const classConfig = itemClasses[selectedClassID] || { meta: { id: '__NONEXISTENT_CLASS' } };

  const pathPrefix = selectedSubregisterID
    ? `subregisters/${selectedSubregisterID}/${classConfig.meta.id}`
    : classConfig.meta.id;

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
    // NOTE: On switching between classes/subregisters,
    // it could be that class configuration has updated,
    // but items.value still contains items of previous type. This isn’t great.
    const orderedItems = Object.values(items.value).sort(classConfig.itemSorter
      ? getItemSorter(classConfig.itemSorter)
      : defaultItemSorterFunc);

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
    <div className={className}>
      {el}
    </div>
  );
};


const ItemList: React.FC<{
  items: RegisterItem<any>[]
  classConfig: ItemClassConfiguration<any>
  getRelatedClassConfig: (classID: string) => RelatedItemClassConfiguration
  selectedItem?: string
  onSelectItem: (item: string | undefined) => void
}> = function ({
  items,
  selectedItem,
  classConfig,
  onSelectItem,
  getRelatedClassConfig,
}) {

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


const ItemDetails: React.FC<{
  itemID?: string
  itemClass: ItemClassConfiguration<any>
  subregisterID?: string
  useRegisterItemData: RegisterItemDataHook
  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration
}> = function ({ itemID, itemClass, subregisterID, getRelatedClass, useRegisterItemData }) {
  let details: JSX.Element;

  //const itemPath = `${itemClass.meta.id}/${itemID}`;
  const _itemPath = `${itemClass.meta.id}/${itemID}`;
  const itemPath = subregisterID ? `subregisters/${subregisterID}/${_itemPath}` : _itemPath;

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
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; padding: 1rem;`}>
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
