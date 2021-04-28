/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import { debounce } from 'throttle-debounce';
//import log from 'electron-log';

import React, { useContext } from 'react';
import { jsx } from '@emotion/core';
//import { FixedSizeList as List } from 'react-window';
import {
  NonIdealState,
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ItemAction,
  RegisterItemDataHook,
  RegistryViewProps,
} from '../types';
import { _getRelatedClass } from './util';
import { BrowserCtx } from './BrowserCtx';
import ItemDetails from './ItemDetails';
import RegisterItemGrid, { SearchQuery } from './RegisterItemGrid';
import { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import { itemPathToItemRefLike, itemPathToItemRef, itemRefToItemPath } from './itemPathUtils';
import { CriteriaGroup, criteriaGroupToQueryExpression, makeBlankCriteria } from './FilterCriteria';


interface Query {
  criteria: CriteriaGroup;
}
type Action =
  | { type: 'select-item'; payload: { itemPath: string | undefined; }; }
  | { type: 'open-item'; payload: { itemPath: string; }; }
  //| { type: 'select-class', payload: { classID: string | undefined } }
  //| { type: 'open-class', payload: { classID: string } }
  //| { type: 'select-subregister', payload: { subregisterID: string | undefined } }
  //| { type: 'open-subregister', payload: { subregisterID: string } }
  | { type: 'update-query'; payload: { query: Query; }; }
  | { type: 'exit-item'; };

interface BaseState {
  view: 'item' | 'grid';
  selectedItemPath: string | undefined;
  query: Query;
}
interface ItemState extends BaseState {
  view: 'item';
  selectedItemPath: string;
  query: Query;
}
interface GridState extends BaseState {
  view: 'grid';
  selectedItemPath: string | undefined;
  query: Query;
}
type State = ItemState |
  GridState;


export const RegisterItemBrowser: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration' | 'subregisters'> & {
  availableClassIDs?: string[]
  useRegisterItemData: RegisterItemDataHook
  itemActions?: ItemAction[]
  className?: string
  style?: React.CSSProperties
}> = function ({
  availableClassIDs,
  subregisters,
  itemClassConfiguration,
  useRegisterItemData,
  itemActions,
  className,
  style,
}) {

  const ctx = useContext(DatasetContext);
  //const { useObjectPaths } = useContext(DatasetContext);
  const { usePersistentDatasetStateReducer } = ctx;
  const [ state, dispatch ] = (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)(
    (prevState, action) => {
      switch (action.type) {
        case 'select-item':
          const selectedItemPath = action.payload.itemPath;
          if (selectedItemPath) {
            return {
              ...prevState,
              selectedItemPath,
            };
          } else {
            return {
              ...prevState,
              view: 'grid',
              selectedItemPath,
            };
          }
        case 'open-item':
          return {
            ...prevState,
            view: 'item',
            selectedItemPath: action.payload.itemPath,
          };
        case 'update-query':
          return {
            ...prevState,
            view: 'grid',
            query: action.payload.query,
          };
        case 'exit-item':
          return {
            ...prevState,
            view: 'grid',
          };
        default:
          throw new Error("Unexpected register item browser state");
      }
    }, {
      view: 'grid',
      selectedItemPath: undefined,
      query: { criteria: makeBlankCriteria() },
    }, null, 'item-browser');

  //const subregisterIsSelected = subregisters !== undefined && selectedItemPathComponents.length === 3;

  const { subregisterID, classID, itemID } = itemPathToItemRefLike(subregisters !== undefined, state.selectedItemPath ?? '');

  const itemClasses = availableClassIDs ?? Object.keys(itemClassConfiguration);
  //const classConfiguration: ItemClassConfigurationSet =
  //  itemClasses.reduce((o: typeof itemClassConfiguration, k: keyof typeof itemClassConfiguration) =>
  //  { o[k] = itemClassConfiguration[k]; return o; }, {});

  const jumpToItem = (classID: string, itemID: string, subregisterID?: string) => {
    if (subregisters === undefined && subregisterID !== undefined) {
      console.error("Unable to jump to register item: indicates subregister, but register does not have any", subregisterID);
      throw new Error("Unable to jump to register item: indicates subregister, but register does not have any");
    } else if (subregisters !== undefined && subregisterID === undefined) {
      console.error("Unable to jump to register item: subregister is required");
      throw new Error("Unable to jump to register item: subregister is required");
    }
    if (subregisterID) {
      if (subregisters![subregisterID] === undefined) {
        console.error("Unable to jump to register item: requested subregister does not exist", subregisterID);
        throw new Error("Unable to jump to register item: requested subregister does not exist");
      } else if (itemClasses.indexOf(classID) < 0) {
        console.error("Unable to jump to register item: requested item class is not allowed", classID);
        throw new Error("Unable to jump to register item: requested item class is not allowed");
      }
    }

    const itemPath: string = subregisterID
      ? `/${subregisterID}/${classID}/${itemID}.yaml`
      : `/${classID}/${itemID}.yaml`;

    dispatch({ type: 'select-item', payload: { itemPath } });
  }

  const getRelatedClass = _getRelatedClass(itemClassConfiguration);

  // useEffect(() => {
  //   if ((selectedClass === undefined && itemClasses.length > 0) ||
  //       (selectedClass && itemClasses.indexOf(selectedClass) < 0)) {
  //     selectClass(itemClasses[0]);
  //   }
  // }, [JSON.stringify(itemClasses)]);


  // XXX: QUERY EXPRESSION HANDLING IS HERE
  // const itemClassPath: string = selectedSubregisterID
  //   ? `/subregisters/${selectedSubregisterID}/${selectedClass ?? 'NONEXISTENT_CLASS'}/`
  //   : `/${selectedClass ?? 'NONEXISTENT_CLASS'}/`;

  // const queryExpression: string = `return objPath.indexOf("${itemClassPath}") === 0`;

  // const normalizedQueryExp = state.queryExpression.trim() || 'return objPath.';
  // const indexReq = useFilteredIndex({ queryExpression: state.queryExpression });
  // const indexID: string = indexReq.value.indexID ?? '';
  // END XXX


  //const objectPathsQuery = useObjectPaths({ pathPrefix });

  //const registerItemQuery = objectPathsQuery.value.
  //  filter(path => path !== '.DS_Store').
  //  map(path => ({ [path.replace('.yaml', '')]: 'utf-8' as const })).
  //  reduce((prev, curr) => ({ ...prev, ...curr }), {})

  //const items = useRegisterItemData(registerItemQuery);

  // if (selectedClass === undefined) {
  //   return <NonIdealState title="Please select item class" />;
  // }

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

  const queryExpression =
    `return (objPath.startsWith("/subregisters/") || objPath.split("/").length >= 3) && ${criteriaGroupToQueryExpression(state.query.criteria)}`;

  let view: JSX.Element;
  if (state.view === 'grid') {
    view = <RegisterItemGrid
      selectedItem={state.selectedItemPath
        ? itemPathToItemRef(subregisters !== undefined, state.selectedItemPath)
        : undefined}
      onSelectItem={(itemRef) => dispatch({
        type: 'select-item',
        payload: { itemPath: itemRefToItemPath(itemRef) },
      })}
      queryExpression={queryExpression}
      toolbar={<SearchQuery
        rootCriteria={state.query.criteria}
        itemClasses={itemClassConfiguration}
        availableClassIDs={availableClassIDs}
        subregisters={subregisters}
        onChange={(criteria) => dispatch({ type: 'update-query', payload: { query: { criteria } } })}
      />}
      getRelatedClassConfig={getRelatedClass}
      useRegisterItemData={useRegisterItemData}
    />;
  } else if (state.view === 'item' && classID && itemID) {
    view = <ItemDetails
      useRegisterItemData={useRegisterItemData}
      getRelatedClass={_getRelatedClass(itemClassConfiguration)}
      // TODO: convert class, subregister and ID combo into a single string item path?
      itemClass={itemClassConfiguration[classID]}
      subregisterID={subregisterID}
      itemID={itemID}
      itemActions={itemActions}
    />
  } else {
    // If item view is requested, but item or class ID is missing,
    // we can’t show any details because the only details view we have for now
    // is regsiter item details view, which requires those.
    view = <NonIdealState icon="heart-broken" title="Not sure what to show" description="Sorry! (Error code: 724A)" />;
  }

  return (
    <BrowserCtx.Provider
        value={{
          jumpToItem,
          itemClasses: itemClassConfiguration,
          subregisters,
          useRegisterItemData,
        }}>
      {view}
    </BrowserCtx.Provider>
  );
};


export default RegisterItemBrowser;
