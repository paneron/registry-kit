/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React, { useContext } from 'react';
import { Button, ButtonGroup, Drawer, DrawerSize } from '@blueprintjs/core';
import type { InternalItemReference } from '../types';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import MaybeItemDetail from './detail/RegisterItem';
import { Protocols } from './protocolRegistry';
import { itemRefToItemPath } from './itemPathUtils';


const ItemDetailDrawer: React.FC<{
  itemRef: InternalItemReference
  isOpen: boolean
  usePortal?: boolean
  portalContainer?: HTMLElement
  onClose: () => void
}> = function ({ itemRef, usePortal, portalContainer, isOpen, onClose }) {
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const path = itemRefToItemPath(itemRef);

  return (
    <Drawer
        isOpen={isOpen}
        usePortal={usePortal}
        portalContainer={portalContainer}
        onClose={onClose}
        enforceFocus={false}
        size={DrawerSize.LARGE}
        css={css`display: flex; flex-flow: column nowrap;`}
        style={{ padding: '0', width: 'unset' }}>
      <ButtonGroup fill>
        <Button
          icon="open-application"
          onClick={() => { onClose(); spawnTab(`${Protocols.ITEM_DETAILS}:${path}`); }}
          text="Open in a tab"
        />
        <Button
          icon="minimize"
          onClick={onClose}
          text="Minimize"
        />
      </ButtonGroup>
      <div css={css`position: relative; flex: 1;`}>
        <MaybeItemDetail.main uri={path} />
      </div>
    </Drawer>
  );
};


export default ItemDetailDrawer;
