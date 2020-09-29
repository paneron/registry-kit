/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { debounce } from 'throttle-debounce';

import log from 'electron-log';

import yaml from 'js-yaml';

import { css, jsx } from '@emotion/core';
import React, { useState, useEffect, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';

import {
  Colors,
  Navbar, NavbarHeading,
  H4,
  NonIdealState,
  ControlGroup, HTMLSelect, Button,
  IOptionProps,
} from '@blueprintjs/core';
import { RegistryViewProps } from './types/views';
import { RegisterItem } from './types';


const CHANGE_REQUEST_OPTIONS: Record<string, IOptionProps> = {
  new: { value: 'new', label: "New change request…" },
} as const;


interface RegisterItemID {
  classID: string
  itemID: string
}


export const RegistryView: React.FC<RegistryViewProps> =
function ({ title, useObjectsChangedEvent, useObjectPaths, useObjectData, itemClassConfiguration, changeObjects }) {
  const [selectedCRID, selectCR] = useState<string | undefined>(undefined);
  const [isBusy, setBusy] = useState(false);
  const [selectedItem, selectItem] = useState<RegisterItemID | undefined>(undefined);

  async function handleOpen(crID: string | undefined) {
    if (crID === undefined) {
      selectCR(undefined);

    } else if (crID === CHANGE_REQUEST_OPTIONS.new.value) {
      setBusy(true);
      try {
        await changeObjects(
          {},
          "Create new CR",
        );
      } finally {
        setBusy(false);
      }

    } else {
      selectCR(crID);
    }
  }

  useObjectsChangedEvent(async ({ objects }) => {
    log.debug("Event: Repo contents changed", objects);
  }, []);

  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap;`}>
      <Header selectedCRID={selectedCRID} onSelectCR={isBusy ? undefined : handleOpen} />

      <div css={css`flex: 1; display: flex; flex-flow: row nowrap;`}>

        <ItemBrowser
          css={css`flex-basis: 20vw; flex-shrink: 0;`}
          itemClasses={itemClassConfiguration}
          selectedItem={selectedItem}
          onSelectItem={selectItem}
          useObjectData={useObjectData}
          useObjectPaths={useObjectPaths}
        />

        <ItemDetails
          css={css`flex: 1;`}
          selectedItem={selectedItem} />

      </div>

      <Toolbar title={title} />
    </div>
  );
};


const Header: React.FC<{ selectedCRID?: string, onSelectCR?: (crID: string | undefined) => void }> =
function ({ selectedCRID, onSelectCR }) {
  const [_selectedCR, _selectCR] = useState<string>(CHANGE_REQUEST_OPTIONS.none.value as string);

  const changeRequestOptions: IOptionProps[] = [
    CHANGE_REQUEST_OPTIONS.none,
    CHANGE_REQUEST_OPTIONS.new,
  ];

  let title: JSX.Element | string;

  if (!selectedCRID) {
    title = "All items";
  } else {
    title = "Change request";
  }

  return (
    <div css={css`display: flex; flex-flow: row nowrap;`}>
      <H4 css={css`flex: 1;`}>
        {title}
      </H4>
      <div>
        <ControlGroup>
          <HTMLSelect
            disabled={!onSelectCR}
            options={changeRequestOptions}
            value={_selectedCR}
            onChange={(evt) => _selectCR(evt.currentTarget.value)}
          />
          <Button disabled={!onSelectCR} onClick={() => onSelectCR ? onSelectCR(_selectedCR) : void 0}>Open</Button>
          <Button disabled={!onSelectCR} onClick={() => onSelectCR ? onSelectCR(undefined) : void 0}>Close</Button>
        </ControlGroup>
      </div>
    </div>
  );
};


const ItemBrowser: React.FC<{
  itemClasses: RegistryViewProps["itemClassConfiguration"]
  selectedItem: RegisterItemID | undefined
  useObjectPaths: RegistryViewProps["useObjectPaths"]
  useObjectData: RegistryViewProps["useObjectData"]
  onSelectItem: (item: RegisterItemID | undefined) => void
}> =
function ({ itemClasses, selectedItem, onSelectItem, useObjectPaths, useObjectData }) {
  const [selectedClass, selectClass] = useState

  <(string & keyof typeof itemClasses) | undefined>
  (undefined);

  const itemClassChoices: IOptionProps[] = Object.entries(itemClasses).map(([classID, classData]) => {
    return { value: classID, label: classData.meta.title };
  });

  const pathPrefix = selectedClass || 'NONEXISTENT_CLASS';

  const objectPaths = useObjectPaths({
    pathPrefix,
  }).value;

  const objectData = useObjectData(
    objectPaths.map(path => ({ path: true as true })).reduce((prev, curr) => ({ ...prev, ...curr })));

  useEffect(() => {
    if (selectedClass === undefined && itemClassChoices.length > 0) {
      selectClass(itemClassChoices[0].value as string);
    }
  }, [itemClassChoices.length]);

  const items: RegisterItem<any>[] = objectPaths.
  map(path =>  objectData.value[path]).
  filter(data => data !== undefined && data !== null && data.encoding === 'utf-8').
  map(data => {
    const serialized = data!.value as string;
    return yaml.load(serialized);
  });

  return (
    <div css={css`display: flex; flex-flow: column nowrap;`}>
      <div css={css`background: ${Colors.LIGHT_GRAY5}`}>
        <HTMLSelect
          fill
          options={itemClassChoices}
          onChange={(evt) => selectClass(evt.currentTarget.value)} />
      </div>
      <div css={css`flex: 1;`}>
        <ItemList
          items={items}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem} />
      </div>
    </div>
  );
};


const ItemList: React.FC<{
  items: RegisterItem<any>[]
  selectedItem: RegisterItemID | undefined
  onSelectItem: (item: RegisterItemID | undefined) => void
}> = function ({ items, selectedItem, onSelectItem }) {

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
        setImmediate(() => onSelectItem({ classID: item.classID, itemID: item.id }));
      }
    }

    return (
      <Button
          minimal fill style={style} alignText="left"
          onClick={handleClick}>

        <span>{item.id}</span>

      </Button>
    );
  };

  function scrollTo(item: RegisterItemID) {
    if (listEl && listEl.current) {
      listEl.current.scrollToItem(
        items.findIndex(i => i.classID === item.classID && i.id === item.itemID),
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
  selectedItem: RegisterItemID | undefined
}> = function ({ selectedItem }) {
  if (selectedItem === undefined) {
    return <NonIdealState title="No item is selected" />
  }
  return <>{selectedItem.classID} {selectedItem.itemID}</>
};


const Toolbar: React.FC<{ title: string }> = function ({ title }) {
  return (
    <Navbar css={css`background: ${Colors.LIGHT_GRAY4}`}>
      <Navbar.Group>
        <NavbarHeading>
          {title}
        </NavbarHeading>
      </Navbar.Group>
    </Navbar>
  );
};


export const nonIdeal = <NonIdealState
  icon="time"
  title="Check back in a bit!"
  description="This view is coming soon" />;
