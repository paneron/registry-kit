/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React from 'react';
import { jsx } from '@emotion/core';
import { RegistryViewProps } from '../types';
import { MenuItem, Menu } from '@blueprintjs/core';


const AddItemMenu: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration' | 'subregisters'> & {
  onSelect: (subregisterID: string | undefined, classID: string) => void
}> = function ({ itemClassConfiguration, subregisters, onSelect }) {
  return (
    <Menu>
      {subregisters
        ? Object.entries(subregisters).map(([subregisterID, subregisterConfig]) =>
            <MenuItem
                key={subregisterID}
                label="Subregister"
                icon="folder-open"
                text={subregisterConfig.title}>
              <ItemClassSubmenu
                itemClassConfiguration={itemClassConfiguration}
                availableClassIDs={subregisterConfig.itemClasses}
                onSelect={(classID) => onSelect(subregisterID, classID)}
              />
            </MenuItem>
          )
        : <ItemClassSubmenu
            itemClassConfiguration={itemClassConfiguration}
            onSelect={(classID) => onSelect(undefined, classID)}
          />}
    </Menu>
  );
}


const ItemClassSubmenu: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration'> & {
  availableClassIDs?: string[]
  onSelect: (classID: string) => void
}> = function ({ availableClassIDs, itemClassConfiguration, onSelect }) {
  return <>
    {(availableClassIDs ?? Object.keys(itemClassConfiguration)).map((classID) =>
      <MenuItem
        key={classID}
        icon="cube"
        disabled={!itemClassConfiguration[classID]}
        label="Item class"
        text={itemClassConfiguration[classID].meta.title ?? 'N/A'}
        onClick={() => onSelect(classID)}
      />
    )}
  </>;
}

export default AddItemMenu;
