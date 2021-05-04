/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx } from '@emotion/core';
import { InternalItemReference, RegisterItem } from '../../types';
import { BrowserCtx } from '../BrowserCtx';
import { itemRefToItemPath } from '../itemPathUtils';


const ItemSummary: React.FC<{ itemRef: InternalItemReference, className?: string }> =
function ({ itemRef, className }) {
  const { useRegisterItemData, getRelatedItemClassConfiguration } = useContext(BrowserCtx);
  const { itemID, classID, subregisterID } = itemRef;
  const ListItemView = getRelatedItemClassConfiguration(classID).itemView;

  const _path = itemRefToItemPath(itemRef!);

  const objectDataResp = useRegisterItemData({
    itemPaths: _path ? [_path] : [],
  });
  const objData = objectDataResp.value[_path];

  const registerItemData = objData as RegisterItem<any> | null;
  const itemPayload = registerItemData?.data;
  const stringItemDescription = `item at ${_path}`;

  return itemPayload
    ? <ListItemView
        getRelatedItemClassConfiguration={getRelatedItemClassConfiguration}
        useRegisterItemData={useRegisterItemData}
        subregisterID={subregisterID}
        itemData={itemPayload}
        className={className}
        itemID={registerItemData?.id ?? itemID} />
    : <>{stringItemDescription}</>;
};


export default ItemSummary;
