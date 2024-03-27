/** @jsx jsx */
/** @jsxFrag React.Fragment */

/**
 * Tools for rendering proposal groups as tree nodes.
 * Each proposal group is top-level node, with proposals as nested nodes.
 */

//import React, { useContext, useMemo } from 'react';
import { jsx } from '@emotion/react';
import type { RegistryViewProps } from '../types/views';
import type { TreeNodeInfo, IconName } from '@blueprintjs/core';
import { MoreMenu, ItemClassMenu } from '../views/util';


export type ItemOrGroupTreeNode = TreeNodeInfo<{ type: 'group' | 'item' }>;


export function getMaybeGroupedItemClassesAsTreeNodes<T extends RegistryViewProps>(
  itemClasses: T['itemClassConfiguration'],
  itemClassGroups: T['itemClassGroups'] | undefined,
  opts?: {
    expandedGroupLabels?: Set<string>
    selectedItemID?: string
    onProposeItem?: (clsID: string) => Promise<void>
  },
): ItemOrGroupTreeNode[] {
  if (!itemClassGroups) {
    return getItemClassesAsTreeNodes(itemClasses, Object.keys(itemClasses), opts);
  } else {
    return Object.entries(itemClassGroups).map(([groupLabel, clsIDs]) => {
      const hasSelectedClass = opts?.selectedItemID && clsIDs.includes(opts.selectedItemID);
      const isSelected = opts?.selectedItemID && groupLabel === opts.selectedItemID
        ? true
        : false;
      const isExpanded = hasSelectedClass || opts?.expandedGroupLabels?.has(groupLabel);
      return {
        id: groupLabel,
        label: groupLabel,
        hasCaret: true,
        isSelected,
        isExpanded,
        icon: isExpanded ? 'folder-open' : 'folder-close' as IconName,
        childNodes: isExpanded
          ? getItemClassesAsTreeNodes(itemClasses, clsIDs, opts)
          : [],
        nodeData: { type: 'group' },
      };
    });
  }
}

function getItemClassesAsTreeNodes<T extends RegistryViewProps['itemClassConfiguration']>(
  itemClasses: T,
  /** Used for ordering. */
  classIDs: readonly (keyof T)[],
  opts?: {
    selectedItemID?: string
    onProposeItem?: (clsID: string) => Promise<void>
  },
): TreeNodeInfo<{ type: 'item' }>[] {
  return classIDs.map(clsID => {
    const cls = itemClasses[clsID];
    return {
      id: clsID as string,
      label: cls?.meta.title ?? 'unknown class',
      icon: 'folder-close',
      isSelected: opts?.selectedItemID === clsID,
      nodeData: { type: 'item' },
      secondaryLabel:
        <MoreMenu>
          <ItemClassMenu
            cfg={cls}
            onCreate={opts?.onProposeItem ?
              () => opts.onProposeItem!(clsID as string)
              : undefined}
          />
        </MoreMenu>,
    };
  });
}
