/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { memo, useContext } from 'react';
import { jsx, css } from '@emotion/react';
import type { RegisterItem } from '../../types';
import { BrowserCtx } from '../BrowserCtx';
import { itemPathToItemRef } from '../itemPathUtils';


/** Register item list view. */
const ListItem: React.FC<{ objectData: RegisterItem<any>, objectPath: string }> =
memo(function ({ objectData, objectPath }) {
  const { subregisters, getRelatedItemClassConfiguration } = useContext(BrowserCtx);

  const fallbackView = (
    <span css={css`opacity: .4`}>
      (missing item data at {objectPath})
    </span>
  );

  try {
    const itemRef = itemPathToItemRef(subregisters !== undefined, objectPath);
    const clsConfig = getRelatedItemClassConfiguration(itemRef.classID);
    const ListItemView = clsConfig.itemView;
    const itemPayload = objectData?.data;

    const itemView = itemPayload
      ? <ListItemView
          itemData={itemPayload}
          itemRef={itemRef}
        />
      : fallbackView;

    return itemView;
  } catch (e) {
    return fallbackView;
  }
});


export default ListItem;
