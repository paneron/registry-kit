/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button, ButtonGroup, type TreeNodeInfo, Tree } from '@blueprintjs/core';
import type { ItemClassConfigurationSet, Subregisters } from '../../types';
import { type CriteriaGroup, makeBlankCriteria, type Criterion, type CompositionOperator, COMPOSITION_OPERATORS } from './models';
import mutateGroup from './mutateGroup';
import criteriaToNodes from './criteriaToNodes';


export const SUBREGISTER_PATH_PREFIX = '/subregisters/';


interface CriteriaTreeProps {
  impliedCriteria?: CriteriaGroup
  criteria: CriteriaGroup
  onChange?: (criteria: CriteriaGroup) => void
  className?: string
  availableClassIDs: string[]

  // TODO: move to context
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters
}


export const CriteriaTree: React.FC<CriteriaTreeProps> =
function ({ criteria, impliedCriteria, onChange, availableClassIDs, itemClasses, subregisters, className }) {
  const [crit, updateCriteria] = useState<CriteriaGroup>(criteria);

  useEffect(() => {
    updateCriteria(criteria);
  }, [JSON.stringify(criteria)]);

  const onAddGroup = useCallback(function (parent: number[]) {
    const p = reverseArray(parent);
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    const newGroup: CriteriaGroup = makeBlankCriteria();
    mutateGroup(newCriteria, p, { action: 'insert', item: newGroup });
    updateCriteria(newCriteria[0]);
    onChange!(newCriteria[0]);
  }, [crit, updateCriteria, onChange]);

  const onDelete = useCallback(function (parent: number[], idx: number) {
    const p = reverseArray(parent);
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    mutateGroup(newCriteria, p, { action: 'delete', idx });
    updateCriteria(newCriteria[0]);
    onChange!(newCriteria[0]);
  }, [crit, updateCriteria, onChange]);

  const onEditItem = useCallback(function (parent: number[], idx: number, newItem: CriteriaGroup | Criterion, commit?: true) {
    const p = reverseArray(parent);
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    mutateGroup(newCriteria, p, { action: 'edit', idx, item: newItem });
    updateCriteria(newCriteria[0]);
    if (commit) {
      onChange!(newCriteria[0]);
    }
  }, [onChange, updateCriteria, crit]);

  const nodes: TreeNodeInfo[] = useMemo(() => criteriaToNodes([crit], {
    onEditItem: onChange ? onEditItem : undefined,
    onAddGroup: onChange ? onAddGroup : undefined,
    onDeleteItem: onChange ? onDelete : undefined,
    itemClasses,
    subregisters,
    availableClassIDs,
  }), [itemClasses, subregisters, availableClassIDs, crit, onChange, onEditItem, onAddGroup, onDelete]);

  const implied: TreeNodeInfo[] = useMemo((() =>
    impliedCriteria !== undefined
      ? criteriaToNodes([impliedCriteria], {
          implied: true,
          itemClasses,
          subregisters,
          availableClassIDs,
        })
      : []
  ), [impliedCriteria, itemClasses, availableClassIDs, subregisters]);

  return (
    <Tree
      contents={useMemo(() => [ ...implied, ...nodes ], [implied, nodes])}
      className={className}
      css={css`
        .bp4-tree-node-content { height: unset; }
        .bp4-tree-node-label { overflow: unset; }
        .bp4-tree-node-caret, .bp4-tree-node-caret-none { display: none; }
      `}
    />
  );
}

export default CriteriaTree;


/* Displaying criteria group labels */

interface CriteriaGroupLabelProps {
  criteriaGroup: CriteriaGroup
  onUpdate?: (op: CompositionOperator) => void
  className?: string
}
export const CriteriaGroupLabel: React.FC<CriteriaGroupLabelProps> =
function ({ criteriaGroup, onUpdate, className }) {
  return <div className={className}>
    {onUpdate
      ? <ButtonGroup>
          {COMPOSITION_OPERATORS.map(op =>
            <Button
                key={op}
                small
                onClick={() => onUpdate ? onUpdate(op) : void 0}
                active={criteriaGroup.require === op}>
              {op}
            </Button>
          )}
        </ButtonGroup>
      : <strong>{criteriaGroup.require}</strong>}
    {" "}
    of:
  </div>;
}


function reverseArray<T>(arr: T[]): T[] {
  var copy = JSON.parse(JSON.stringify(arr));
  copy.reverse();
  return copy;
}
