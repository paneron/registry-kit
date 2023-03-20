/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/react';
import { NonIdealState } from '@blueprintjs/core';
import useCustomView from '../../hooks/useCustomView';


const CustomViewMain: React.FC<{ uri: string }> = function ({ uri }) {
  const [viewID, ...pathComponents] = uri.split('/');
  const { value: view } = useCustomView(viewID);
  const fallbackView = (() => <NonIdealState
    icon="heart-broken"
    title="Unable to show this view"
    description={`Custom view ${uri} cannot be displayed (not found in registry configuration)`}
  />);
  const View = view?.view ?? fallbackView;
  return <View path={pathComponents.join('/')} />;
};


const CustomViewTitle: React.FC<{ uri: string }> = function ({ uri }) {
  const { value: view } = useCustomView(uri);
  return <>{view?.label ?? 'unknown view'}</>;
}


export default { main: CustomViewMain, title: CustomViewTitle, plainTitle: async () => "custom view" };


// function useCRData(id: string | undefined): ValueHook<ChangeRequest | undefined> {
//   const { useObjectData } = useContext(DatasetContext);
//   const objectPath = `change-requests/${id ?? 'NONEXISTENT_CR_ID'}.yaml`;
//   const crDataResp = useObjectData({ objectPaths: [objectPath] });
//   const crData = crDataResp.value.data?.[objectPath] as ChangeRequest | null;
//   return {
//     value: crData ?? undefined,
//     isUpdating: crDataResp.isUpdating,
//     errors: crDataResp.errors,
//     refresh: crDataResp.refresh,
//     _reqCounter: crDataResp._reqCounter,
//   };
// }
