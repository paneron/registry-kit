/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import { debounce } from 'throttle-debounce';
//import log from 'electron-log';

import React, { useContext, useMemo, useState } from 'react';
import { jsx, css } from '@emotion/core';
//import { FixedSizeList as List } from 'react-window';
import {
  Icon,
  NonIdealState, Spinner, Toaster,
} from '@blueprintjs/core';

import useDebounce from '@riboseinc/paneron-extension-kit/useDebounce';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ItemAction,
  RegisterItem,
  RegisterItemDataHook,
  RegistryViewProps,
} from '../types';
import { _getRelatedClass } from './util';
import { BrowserCtx } from './BrowserCtx';
import ItemDetails from './ItemDetails';
import RegisterItemGrid, { SearchQuery } from './RegisterItemGrid';
import { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import { itemPathToItemRef, itemRefToItemPath } from './itemPathUtils';
import criteriaGroupToQueryExpression from './FilterCriteria/criteriaGroupToQueryExpression';
import { CriteriaGroup, makeBlankCriteria } from './FilterCriteria/models';
import makeSidebar from '@riboseinc/paneron-extension-kit/widgets/Sidebar';


const toaster = Toaster.create({ position: 'bottom' });


interface Query {
  criteria: CriteriaGroup;
}
type Action =
  | { type: 'update-query'; payload: { query: Query; }; }
  | { type: 'enter-cr'; payload: { crid: string; }; }
  | { type: 'exit-cr' }
  | { type: 'select-item'; payload: { itemPath: string | undefined; }; }
  | { type: 'open-item'; payload: { itemPath: string; }; }
  //| { type: 'select-class', payload: { classID: string | undefined } }
  //| { type: 'open-class', payload: { classID: string } }
  //| { type: 'select-subregister', payload: { subregisterID: string | undefined } }
  //| { type: 'open-subregister', payload: { subregisterID: string } }
  | { type: 'exit-item'; };

interface BaseState {
  view: 'item' | 'grid';
  selectedItemPath: string | undefined;
  selectedCRID: string | undefined;
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
type State = ItemState | GridState;


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
  const { usePersistentDatasetStateReducer, updateObjects } = ctx;
  const [viewingMeta, setViewingMeta] = useState(false);
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
        case 'enter-cr':
          return {
            ...prevState,
            selectedCRID: action.payload.crid,
          };
        case 'exit-cr':
          return {
            ...prevState,
            selectedCRID: undefined,
          };
        default:
          throw new Error("Unexpected register item browser state");
      }
    }, {
      view: 'grid',
      selectedItemPath: undefined,
      selectedCRID: undefined,
      query: { criteria: makeBlankCriteria() },
    }, null, 'item-browser');

  const queryExpression = useDebounce(
    criteriaGroupToQueryExpression(state.query.criteria),
    500);
  
  const Sidebar = useMemo(() => makeSidebar(usePersistentDatasetStateReducer!), []);

  // TODO: Duplicated in Paneron host, move out?
  const [_operationKey, setOperationKey] = useState<string | undefined>(undefined);
  const isBusy = _operationKey !== undefined;
  function performOperation<P extends any[], R>(gerund: string, func: (...opts: P) => Promise<R>) {
    return async (...opts: P) => {
      if (_operationKey !== undefined) {
        console.debug("performOperation: another operation is in progress");
        return;
      }
      const opKey = toaster.show({
        message: `${gerund}…`,
        intent: 'primary',
        icon: <Spinner size={Icon.SIZE_STANDARD} />,
        timeout: 0,
      });
      setOperationKey(opKey);
      try {
        const result: R = await func(...opts);
        toaster.dismiss(opKey);
        toaster.show({ message: `Done ${gerund}`, intent: 'success', icon: 'tick-circle' });
        setOperationKey(undefined);
        return result;
      } catch (e) {
        let errMsg: string;
        if (e.message.indexOf('Error:')) {
          const msgParts = e.message.split('Error:');
          errMsg = msgParts[msgParts.length - 1].trim();
        } else {
          errMsg = e.message;
        }
        toaster.dismiss(opKey);
        toaster.show({
          message: `Problem ${gerund}. The error said: “${errMsg}”`,
          intent: 'danger',
          icon: 'error',
          timeout: 0,
          onDismiss: () => {
            setOperationKey(undefined);
          },
        });
        throw e;
      }
    }
  }

  const itemClasses = availableClassIDs ?? Object.keys(itemClassConfiguration);

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
  };

  const getRelatedClass = _getRelatedClass(itemClassConfiguration);

  // NOTE: Calls to these functions are guarded by checks
  // that updateObjects & makeRandomID are specified.
  async function handleClarifyItem(
      oldValue: RegisterItem<any>,
      newValue: RegisterItem<any>,
      commitMessage: string) {
    if (!selectedItemRef) {
      throw new Error("Unable to clarify item: item is not selected");
    }
    const objectPath = itemRefToItemPath(selectedItemRef);
    await updateObjects!({
      commitMessage,
      objectChangeset: {
        [objectPath]: {
          oldValue,
          newValue,
        },
      },
    });
  }

  // async function handleAddItem(
  //     classID: string,
  //     subregisterID: string | undefined,
  //     newValue: RegisterItem<any>,
  //     commitMessage: string) {
  //   const itemID = await makeRandomID!();
  //   const itemRef: InternalItemReference = { classID, subregisterID, itemID };
  //   const objectPath = itemRefToItemPath(itemRef);
  //   await updateObjects!({
  //     commitMessage,
  //     objectChangeset: {
  //       [objectPath]: {
  //         oldValue: null,
  //         newValue,
  //       },
  //     },
  //   });
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

  const selectedItemRef = state.selectedItemPath
    ? itemPathToItemRef(subregisters !== undefined, state.selectedItemPath)
    : undefined;

  let view: JSX.Element;
  if (state.view === 'grid') {
    view = <RegisterItemGrid
      selectedItem={viewingMeta ? undefined : selectedItemRef}
      queryExpression={queryExpression} // TODO: Should pass actual structured criteria here probably.
      onTransformFilterCriteria={(transformer) => dispatch({
        type: 'update-query',
        payload: { query: { criteria: transformer(state.query.criteria) } },
      })}
      onSelectItem={(itemRef) => {
        dispatch({
          type: 'select-item',
          payload: { itemPath: itemRef ? itemRefToItemPath(itemRef) : undefined },
        });
        setViewingMeta(false);
      }}
      onOpenItem={(itemRef) => {
        dispatch({
          type: 'open-item',
          payload: { itemPath: itemRefToItemPath(itemRef) },
        })
      }}
      sidebarOverride={viewingMeta
        ? <Sidebar
            stateKey='register-info'
            css={css`width: 280px; z-index: 1;`}
            title="Register metadata"
            blocks={[{
              key: 'basics',
              title: "Basics",
              content: <>TBD</>,
            }]}
          />
        : undefined}
      toolbar={<SearchQuery
        rootCriteria={state.query.criteria}
        onCriteriaChange={(criteria) => dispatch({ type: 'update-query', payload: { query: { criteria } } })}
        viewingMeta={viewingMeta}
        onViewMeta={setViewingMeta}
        itemClasses={itemClassConfiguration}
        availableClassIDs={availableClassIDs}
        subregisters={subregisters}
        activeCRID={state.selectedCRID}
        onSelectCR={(crid) => crid
          ? dispatch({ type: 'enter-cr', payload: { crid } })
          : dispatch({ type: 'exit-cr' })}
      />}
      getRelatedClassConfig={getRelatedClass}
      useRegisterItemData={useRegisterItemData}
    />;
  } else if (state.view === 'item' && selectedItemRef !== undefined) {
    view = <ItemDetails
      itemRef={selectedItemRef}
      itemActions={itemActions}
      onClose={!isBusy ? () => dispatch({ type: 'exit-item' }) : undefined}
      onChange={!isBusy && updateObjects ? performOperation('saving item changes', handleClarifyItem) : undefined}
    />;
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
          getRelatedItemClassConfiguration: getRelatedClass,
        }}>
      {view}
    </BrowserCtx.Provider>
  );
};


export default RegisterItemBrowser;
