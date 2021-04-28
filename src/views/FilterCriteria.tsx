/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/core';
import React, { ReactNode, ReactNodeArray, useEffect, useState } from 'react';
import { Button, ButtonGroup, HTMLSelect, OptionProps, TreeNodeInfo, Tree, ControlGroup, Colors, InputGroup } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
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
  label: string
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
    label: "Item class is",
    toQuery: ({ classID }, { subregisters }) =>
      `objPath.indexOf("/${classID}/") === ${subregisters ? SUBREGISTER_PATH_PREFIX.length : 0}`,
    fromQuery: (query) => ({
      classID: query.split('/')[1],
    }),
    toSummary: ({ classID }, { itemClasses }) => {
      if (classID) {
        return itemClasses[classID]?.meta.title ?? classID;
      } else {
        return "(N/A)";
      }
    },
    widget: ({ data, onChange, itemClasses, className, style }) => {
      const itemClassChoices: OptionProps[] = [
        ...Object.entries(itemClasses).
        map(([classID, classData]) => {
          return { value: classID, label: classData?.meta?.title ?? "Unknown class" };
        }),
        { value: '', label: "(not selected)" },
      ];
      return (
        <HTMLSelect
          className={className}
          style={style}
          fill
          minimal
          options={itemClassChoices}
          value={data.classID ?? ''}
          disabled={!onChange}
          onChange={onChange
            ? (evt) => onChange!({ classID: evt.currentTarget.value })
            : undefined} />
      );
    },
  } as CriterionConfiguration<{ classID?: string }>,
  'custom': {
    label: "Satisfies expression",
    toQuery: ({ customExpression }) =>
      customExpression,
    fromQuery: (query) => ({
      customExpression: query,
    }),
    toSummary: () =>
      <>(custom exp.)</>,
    widget: ({ data, onChange, className }) => {
      return (
        <InputGroup
          className={className}
          value={data.customExpression ?? 'true'}
          placeholder="Enter a valid query expression…"
          disabled={!onChange}
          onChange={onChange ? (evt) => onChange!({ customExpression: evt.currentTarget.value }) : undefined} />
      );
    },
  } as CriterionConfiguration<{ customExpression?: string }>,
};

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
  const [isExpanded, expand] = useState(false);

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
    <Popover2
        isOpen={isExpanded}
        minimal
        css={css`.bp3-popover2 .bp3-popover2-content { border-radius: 0 !important; }`}
        content={
          <div css={css`padding: 1rem 0`}>
            <Tree contents={[ ...implied, ...nodes ]} />
            <div css={css`padding: 1rem 1rem 0 1rem; color: ${Colors.GRAY3}; font-size: 90%;`}>
              <code>{criteriaGroupToQueryExpression(crit)}</code>
            </div>
          </div>}>
      <Button
          className={className}
          active={isExpanded}
          onClick={() => expand(!isExpanded)}>
        {criteriaGroupToSummary(crit, { itemClasses, subregisters })}
      </Button>
    </Popover2>
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

export function criteriaGroupToSummary(cg: CriteriaGroup, opts: CommonOpts): JSX.Element {
  const exps: JSX.Element[] = [];

  for (const c of cg.criteria) {
    if (isCriteriaGroup(c)) {
      exps.push(criteriaGroupToSummary(c, opts));
    } else {
      const cfg = CRITERIA_CONFIGURATION[c.key];
      if (!cfg) {
        console.error("Missing criterion configuration for key", c.key);
        throw new Error("Missing criterion configuration");
      }
      exps.push(<>{cfg.label} “{cfg.toSummary(cfg.fromQuery(c.query, opts), opts)}”</>);
    }
  }

  let result: JSX.Element;
  if (exps.length < 1) {
    result = <>(no-op)</>;
  } else {
    switch (cg.require) {
      case 'all':
        result = <>{exps.reduce((acc: ReactNodeArray, current: ReactNode, index: number) => [...acc, index ? ' and ' : '', current], [])}</>;
        break;
      case 'any':
        result = <>{exps.reduce((acc: ReactNodeArray, current: ReactNode, index: number) => [...acc, index ? ' or ' : '', current], [])}</>;
        break;
      case 'none':
        result = <>neither {exps.reduce((acc: ReactNodeArray, current: ReactNode, index: number) => [...acc, index ? ' nor ' : '', current], [])}</>;
        break;
    }
  }

  return result;
}

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

  return result;
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
): TreeNodeInfo[] {
  const path = opts.path ?? [];

  return [ ...cs.entries() ].map(([idx, c]): TreeNodeInfo => {
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
          opts.onEditItem
            ? [ ...cg.criteria, { key: 'custom', query: '' } ]
            : cg.criteria,
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
      const criterionTypeOptions: OptionProps[] = Object.entries(CRITERIA_CONFIGURATION).
        map(([key, cfg]) => {
          return { value: key, label: cfg.label };
        });
      const label = ci.key === 'custom' && ci.query === ''
        ? <Button
            small
            onClick={() => opts.onEditItem!(
              path,
              idx,
              { key: 'custom', query: cfg.toQuery({ customExpression: 'true' }, { subregisters, itemClasses }) },
              true)}>
            Add…
          </Button>
        : <ControlGroup>
            <HTMLSelect
              minimal
              options={criterionTypeOptions}
              value={ci.key}
              disabled={!opts.onEditItem}
              onChange={opts.onEditItem
                ? (evt) => {
                    if (evt.currentTarget.value !== '' && isCriteriaKey(evt.currentTarget.value)) {
                      opts.onEditItem!(
                        path,
                        idx,
                        { key: evt.currentTarget.value, query: '' },
                      );
                    }
                  }
                : undefined} />
            <Widget
              itemClasses={opts.itemClasses}
              availableClassIDs={opts.availableClassIDs}
              subregisters={opts.subregisters}
              data={data}
              onChange={(val) => opts.onEditItem!(
                path,
                idx,
                { key: ci.key, query: cfg.toQuery(val, { subregisters, itemClasses }) },
                true)}
            />
          </ControlGroup>;
      return {
        id: `${path.join('-')}-${idx}-${opts.implied ? 'implied' : ''}`,
        disabled,
        icon,
        label,
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
