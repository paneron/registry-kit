/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/core';
import React, { useEffect, useState } from 'react';
import { Button, ButtonGroup, EditableText, HTMLSelect, IOptionProps, ITreeNode, Tree } from '@blueprintjs/core';
import { ItemClassConfigurationSet, Subregisters } from '../types';


const COMPOSITION_OPERATORS = [
  'all',
  'any',
  'none',
] as const;

type CompositionOperator = typeof COMPOSITION_OPERATORS[number];


const CRITERIA_KEYS = [
  'item-class',
  'custom',
] as const;

type CriterionKey = typeof CRITERIA_KEYS[number];

function isCriteriaKey(val: string): val is CriterionKey {
  return CRITERIA_KEYS.indexOf(val as CriterionKey) >= 0;
}

type CriteriaWidget<T extends Record<string, any>> = React.FC<{
  data: T
  onChange?: (newData: T) => void
  availableClassIDs: string[]
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters
  className?: string
  style?: React.CSSProperties
}>
interface Criterion {
  key: CriterionKey
  query: string
}

interface CommonOpts {
  subregisters?: Subregisters
  itemClasses: ItemClassConfigurationSet
}

interface CriterionConfiguration<T extends Record<string, any>> {
  label: JSX.Element | string
  widget: CriteriaWidget<T>
  toSummary: (data: T, opts: CommonOpts) => string | JSX.Element
  toQuery: (data: T, opts: CommonOpts) => string
  fromQuery: (query: string, opts: CommonOpts) => T
}

type CriteriaConfiguration = {
  [key in CriterionKey]: CriterionConfiguration<Record<string, unknown>>
}

const SUBREGISTER_PATH_PREFIX = '/subregisters/';

const CRITERIA_CONFIGURATION: CriteriaConfiguration = {
  'item-class': {
    label: "Item class",
    toQuery: ({ classID }, { subregisters }) =>
      `objPath.indexOf("/${classID}/") === ${subregisters ? SUBREGISTER_PATH_PREFIX.length : 0}`,
    fromQuery: (query) => ({
      classID: query.split('/')[1],
    }),
    toSummary: ({ classID }, { itemClasses }) => {
      if (classID) {
        return itemClasses[classID]?.meta.title ?? classID;
      } else {
        return "No class selected";
      }
    },
    widget: ({ data, onChange, itemClasses, className, style }) => {
      const itemClassChoices: IOptionProps[] = Object.entries(itemClasses).
      map(([classID, classData]) => {
        return { value: classID, label: classData?.meta?.title ?? "Unknown class" };
      });
      return (
        <HTMLSelect
          className={className}
          style={style}
          fill
          minimal
          options={itemClassChoices}
          value={data.classID ?? '—'}
          disabled={!onChange}
          onChange={onChange
            ? (evt) => onChange!({ classID: evt.currentTarget.value })
            : undefined} />
      );
    },
  } as CriterionConfiguration<{ classID?: string }>,
  'custom': {
    label: "Custom query",
    toQuery: ({ customExpression }) =>
      `return ${customExpression}`,
    fromQuery: (query) => ({
      customExpression: query.replace('return ', ''),
    }),
    toSummary: ({ customExpression }) =>
      <code>${customExpression}</code>,
    widget: ({ data, onChange, className }) => {
      return (
        <EditableText
          className={className}
          value={data.customExpression ?? 'return true'}
          placeholder="Enter a valid query expression…"
          disabled={!onChange}
          onChange={onChange ? (val) => onChange!({ customExpression: val }) : undefined}
          onConfirm={(val) => val.trim() !== ''
            ? onChange!({ customExpression: val.trim() })
            : void 0} />
      );
    },
  } as CriterionConfiguration<{ customExpression?: string }>,
}

export interface CriteriaGroup {
  require: 'all' | 'any' | 'none'
  criteria: (CriteriaGroup | Criterion)[]
}

function isCriteriaGroup(val: any): val is CriteriaGroup {
  return val.hasOwnProperty('require');
}

export function makeBlankCriteria(): CriteriaGroup {
  return { require: 'all', criteria: [] }
};


interface CriteriaProps {
  impliedCriteria?: CriteriaGroup
  criteria: CriteriaGroup
  onChange?: (criteria: CriteriaGroup) => void
  className?: string
  availableClassIDs: string[]

  // TODO: move to context
  itemClasses: ItemClassConfigurationSet
  subregisters?: Subregisters
}


export const CriteriaTree: React.FC<CriteriaProps> =
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

  const nodes: ITreeNode[] = criteriaToNodes([crit], {
    onEditItem: onChange ? onEditItem : undefined,
    onAddGroup: onChange ? onAddGroup : undefined,
    onDeleteItem: onChange ? onDelete : undefined,
    itemClasses,
    subregisters,
    availableClassIDs,
  });

  const implied: ITreeNode[] = impliedCriteria !== undefined
    ? criteriaToNodes([impliedCriteria], {
        implied: true,
        itemClasses,
        subregisters,
        availableClassIDs,
      })
    : [];

  return (
    <Tree className={className} contents={[ ...implied, ...nodes ]} />
  );
}

export default CriteriaTree;


/* Displaying criteria group labels */

interface CriteriaGroupLabelProps {
  criteriaGroup: CriteriaGroup
  onUpdate?: (op: CompositionOperator) => void
}
const CriteriaGroupLabel: React.FC<CriteriaGroupLabelProps> = function ({ criteriaGroup, onUpdate }) {
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


/* Building query expression */

// function criteriaToQueryExpression(cs: (CriteriaGroup | Criteria)[], prefix = 'return '): string {
//   return [ ...cs.entries() ].map(([idx, c]): string => {
//     if (isCriteriaGroup(c)) {
//       const cg = c as CriteriaGroup;
//       return `${prefix} ${criteriaToQueryExpression(cg.criteria, )}`;
//     } else {
//       const ci = c as Criteria;
//     }
//   };
// }

export function criteriaGroupToQueryExpression(cg: CriteriaGroup): string {
  const exps: string[] = [];

  for (const c of cg.criteria) {
    if (isCriteriaGroup(c)) {
      exps.push(`${criteriaGroupToQueryExpression(c)}`);
    } else {
      exps.push(c.query);
    }
  }

  let result: string;
  if (exps.length < 1) {
    result = `true;`
  } else {
    switch (cg.require) {
      case 'all':
        result = exps.join(' && ');
        break;
      case 'any':
        result = exps.join(' || ');
        break;
      case 'none':
        result = exps.map(exp => `${exp} === false`).join(' && ');
        break;
    }
  }

  return `return (objPath.startsWith("/subregisters/") || objPath.split("/").length >= 3) && ${result}`;
}


/* Building tree nodes */

function criteriaToNodes(
  cs: (CriteriaGroup | Criterion)[],
  opts: {
    path?: number[],
    implied?: true,
    onEditItem?: (parent: number[], idx: number, newItem: CriteriaGroup | Criterion, commit?: true) => void,
    onDeleteItem?: (parent: number[], idx: number) => void,
    onAddGroup?: (parent: number[]) => void

    itemClasses: ItemClassConfigurationSet
    availableClassIDs: string[]
    subregisters?: Subregisters
  },
): ITreeNode[] {
  const path = opts.path ?? [];

  return [ ...cs.entries() ].map(([idx, c]): ITreeNode => {
    const isRoot = path.length < 1;
    const icon = isRoot && opts.implied === true ? 'manual' : undefined;
    const disabled = opts.implied === true;
    const deleteButton: JSX.Element | null =
      idx < (cs.length - 1) &&
      opts.onDeleteItem &&
      !isRoot
      ? <Button minimal small
          onClick={() => opts.onDeleteItem!(path, idx)}
          icon="cross" />
      : null;

    if (isCriteriaGroup(c)) {
      const cg = c as CriteriaGroup;
      return {
        id: `${path.join('-')}-${idx}-${opts.implied}`,
        disabled,
        hasCaret: true,
        isExpanded: true,
        icon,
        label: <CriteriaGroupLabel
          criteriaGroup={cg}
          onUpdate={opts.onEditItem
            ? ((op) => opts.onEditItem!(path, idx, { ...cg, require: op }, true))
            : undefined} />,
        secondaryLabel: <ButtonGroup>
          {opts.implied && isRoot ? <>(implied from plan)</> : null}
          {opts.onAddGroup
            ? <Button minimal small
                onClick={() => opts.onAddGroup!([...path, idx])}
                icon="more" />
            : null}
          {deleteButton}
        </ButtonGroup>,
        childNodes: criteriaToNodes(
          opts.onEditItem ? [ ...cg.criteria, { key: 'custom', query: 'return true;' } ] : cg.criteria,
          { ...opts, path: [ ...path, idx ] }),
      };
    } else {
      const ci = c as Criterion;
      const { subregisters, itemClasses } = opts;
      if (!isCriteriaKey(ci.key)) {
        console.error("Invalid criteria key encountered", ci.key);
        throw new Error("Invalid criteria key encountered");
      }
      const cfg = CRITERIA_CONFIGURATION[ci.key];
      if (!cfg) {
        console.error("Missing criterion configuration for key", ci.key)
        throw new Error("Missing criterion configuration");
      }
      const Widget = cfg.widget;
      const data = cfg.fromQuery(ci.query, { subregisters, itemClasses });
      return {
        id: `${path.join('-')}-${idx}-${opts.implied ? 'implied' : ''}`,
        disabled,
        icon,
        label: <Widget
          itemClasses={opts.itemClasses}
          availableClassIDs={opts.availableClassIDs}
          subregisters={opts.subregisters}
          data={data}
          onChange={(val) => opts.onEditItem!(
            path,
            idx,
            { key: ci.key, query: cfg.toQuery(val, { subregisters, itemClasses }) },
            true)}
        />,
        secondaryLabel: <ButtonGroup>
          {deleteButton}
        </ButtonGroup>,
      };
    }
  });
}


/* Mutating criteria tree */

type TreeMutation<T> =
  { action: 'delete', idx: number } |
  { action: 'insert', item: T } |
  { action: 'edit', idx: number, item: T };

function mutateGroup(
    criteria: (CriteriaGroup | Criterion)[],
    path: number[],
    // Here path must be parent node path in reverse (top-level index coming last).
    mutation: TreeMutation<CriteriaGroup | Criterion>) {

  if (path.length < 1 && mutation.action === 'edit') {
    (criteria[0] as CriteriaGroup).require = (mutation.item as CriteriaGroup).require;
  }
  for (const [curIdx, c] of criteria.entries()) {
    if (curIdx === path[path.length - 1]) {
      path.pop();

      let cg: CriteriaGroup;
      if (c.hasOwnProperty('criteria')) {
        // This item is a group, let’s go in and delete descendants
        cg = c as CriteriaGroup;
      } else {
        // This item is a predicate string, can’t go in and delete descendants
        throw new Error(`Cannot enter item: not a group at path ${path.join('/')}/${curIdx}: ${c}`);
      }

      if (path.length > 0) {
        mutateGroup(cg.criteria, path, mutation);
      } else {
        if (mutation.action === 'delete') {
          cg.criteria.splice(mutation.idx, 1);
        } else if (mutation.action === 'insert') {
          cg.criteria.push(mutation.item);
        } else if (mutation.action === 'edit') {
          if (cg.criteria[mutation.idx] === undefined && mutation.idx === cg.criteria.length) {
            if (mutation.item.hasOwnProperty('require')) {
              console.error(cg.criteria, mutation);
              throw new Error("Won’t auto-insert new group");
            }
            // It may be that a new item is being appended
            cg.criteria.push(mutation.item);
          }
          const isGroup = cg.criteria[mutation.idx].hasOwnProperty('require');
          if (isGroup) {
            // If it’s a group, only change the predicate operator to preserve nested items:
            (cg.criteria[mutation.idx] as CriteriaGroup).require =
              (mutation.item as CriteriaGroup).require;
          } else {
            cg.criteria[mutation.idx] = mutation.item;
          }
        }
      }
    }
  }
}
