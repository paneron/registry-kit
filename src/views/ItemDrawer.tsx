/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { useContext, useMemo, useCallback } from 'react';
import { Drawer } from '@blueprintjs/core';
import type { InternalItemReference } from '../types';
import type { Criterion, CriteriaGroup } from './FilterCriteria/models';
import { BrowserCtx } from './BrowserCtx';
import Search from './sidebar/Search';
import { itemPathToItemRef } from './itemPathUtils';


const ItemSearchDrawer: React.FC<{
  isOpen: boolean
  onClose: () => void
  onChooseItem: (itemRef: InternalItemReference) => void
  availableClassIDs: string[]
}> = function ({
  isOpen, onClose, onChooseItem,
  availableClassIDs,
}) {
  const { subregisters } = useContext(BrowserCtx);

  const classCriteria: Criterion[] = useMemo(() => (
    availableClassIDs.map(clsID => ({
      key: 'item-class',
      query: `objPath.indexOf(\"/${clsID}/\") >= 0`,
    }))
  ), [availableClassIDs.toString()]);

  const implicitCriteria: CriteriaGroup | undefined = useMemo(() => (
    classCriteria.length > 0
      ? {
          require: 'any',
          criteria: classCriteria,
        }
      : undefined
  ), [classCriteria]);

  const handleOpenItem = useCallback((itemPath) => {
    onChooseItem(itemPathToItemRef(subregisters !== undefined, itemPath));
    onClose();
  }, [onChooseItem, onClose]);

  return (
    <Drawer
        isOpen={isOpen}
        onClose={onClose}
        enforceFocus={false}
        size="50vw"
        style={{ padding: '0', width: 'unset' }}>
      <Search
        style={{ height: '100vh', width: '50vw', minWidth: '500px', maxWidth: '90vw' }}
        availableClassIDs={availableClassIDs}
        implicitCriteria={implicitCriteria}
        stateName="superseding-item-selector-search"
        onOpenItem={handleOpenItem}
      />
    </Drawer>
  );
};


export default ItemSearchDrawer;
