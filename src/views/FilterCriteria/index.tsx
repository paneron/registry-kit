/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/core';
import React, { useEffect, useState } from 'react';
import { Button, ButtonGroup, TreeNodeInfo, Tree } from '@blueprintjs/core';
import { ItemClassConfigurationSet, Subregisters } from '../../types';
import { CriteriaGroup, makeBlankCriteria, Criterion, CompositionOperator, COMPOSITION_OPERATORS } from './models';
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

  function onAddGroup(parent: number[]) {
    var p = JSON.parse(JSON.stringify(parent));
    p.reverse();
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    const newGroup: CriteriaGroup = makeBlankCriteria();
    mutateGroup(newCriteria, p, { action: 'insert', item: newGroup });
    updateCriteria(newCriteria[0]);
    onChange!(newCriteria[0]);
  }

  function onDelete(parent: number[], idx: number) {
    var p = JSON.parse(JSON.stringify(parent));
    p.reverse();
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    mutateGroup(newCriteria, p, { action: 'delete', idx });
    updateCriteria(newCriteria[0]);
    onChange!(newCriteria[0]);
  }

  function onEditItem(parent: number[], idx: number, newItem: CriteriaGroup | Criterion, commit?: true) {
    var p = JSON.parse(JSON.stringify(parent));
    p.reverse();
    var newCriteria = JSON.parse(JSON.stringify([crit]));
    mutateGroup(newCriteria, p, { action: 'edit', idx, item: newItem });
    updateCriteria(newCriteria[0]);
    if (commit) {
      onChange!(newCriteria[0]);
    }
  }

  const nodes: TreeNodeInfo[] = criteriaToNodes([crit], {
    onEditItem: onChange ? onEditItem : undefined,
    onAddGroup: onChange ? onAddGroup : undefined,
    onDeleteItem: onChange ? onDelete : undefined,
    itemClasses,
    subregisters,
    availableClassIDs,
  });

  const implied: TreeNodeInfo[] = impliedCriteria !== undefined
    ? criteriaToNodes([impliedCriteria], {
        implied: true,
        itemClasses,
        subregisters,
        availableClassIDs,
      })
    : [];

  return (
    <Tree contents={[ ...implied, ...nodes ]} />
  );
}

export default CriteriaTree;


/* Displaying criteria group labels */

interface CriteriaGroupLabelProps {
  criteriaGroup: CriteriaGroup
  onUpdate?: (op: CompositionOperator) => void
}
export const CriteriaGroupLabel: React.FC<CriteriaGroupLabelProps> = function ({ criteriaGroup, onUpdate }) {
  return <>
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
  </>;
}
