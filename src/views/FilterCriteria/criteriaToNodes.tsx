/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx, css } from '@emotion/react';
import React from 'react';
import { Button, ButtonGroup, OptionProps, TreeNodeInfo, ControlGroup } from '@blueprintjs/core';
import { Select } from '@riboseinc/paneron-extension-kit/widgets/Sidebar/PropertyView';
import { ItemClassConfigurationSet, Subregisters } from '../../types';
import { CriteriaGroup, Criterion, isCriteriaGroup, isCriteriaKey } from './models';
import { CriteriaGroupLabel } from './index';
import { CRITERIA_CONFIGURATION } from './CRITERIA_CONFIGURATION';


/**
 * Builds Blueprint’s tree nodes given criteria,
 * callbacks and relevant register configuration.
 */
export default function criteriaToNodes(
  cs: (CriteriaGroup | Criterion)[],
  opts: {
    path?: number[];

    /** XXX: This seems to be obsolete. Don’t use, investigate for usefulness. */
    implied?: true;

    /**
     * Called when criteria is being edited. `commit` is set to true
     * when change should take effect.
     */
    onEditItem?: (parent: number[], idx: number, newItem: CriteriaGroup | Criterion, commit?: true) => void;
    onDeleteItem?: (parent: number[], idx: number) => void;
    onAddGroup?: (parent: number[]) => void;

    itemClasses: ItemClassConfigurationSet;
    availableClassIDs: string[];
    subregisters?: Subregisters;
  }): TreeNodeInfo[] {
  const path = opts.path ?? [];

  return [...cs.entries()].map(([idx, c]): TreeNodeInfo => {
    const isRoot = path.length < 1;
    const defaultIcon = isRoot && opts.implied === true
      ? 'manual'
      : undefined;

    const disabled = opts.implied === true;
    const deleteButton: JSX.Element | null =
      idx < (cs.length - 1) && opts.onDeleteItem
        ? <Button minimal small
            onClick={() => opts.onDeleteItem!(path, idx)}
            title="Delete this criterion or criteria block"
            disabled={isRoot}
            icon="cross" />
        : null;
    const addGroupButton: JSX.Element | null = opts.onAddGroup
      ? <Button
          minimal
          small
          title="Add nested criteria block"
          icon="add-to-artifact"
          onClick={() => opts.onAddGroup!([...path, idx])} />
      : null;

    if (isCriteriaGroup(c)) {

      // Render criteria group recursively

      const cg = c as CriteriaGroup;
      return {
        id: `${path.join('-')}-${idx}-${opts.implied}`,
        disabled,
        hasCaret: true,
        isExpanded: true,
        icon: defaultIcon,
        label: <CriteriaGroupLabel
          css={css`margin: 2.5px 0`}
          criteriaGroup={cg}
          onUpdate={opts.onEditItem
            ? ((op) => opts.onEditItem!(path, idx, { ...cg, require: op }, true))
            : undefined} />,
        secondaryLabel: <ButtonGroup>
          {opts.implied && isRoot ? <>(implied)</> : null}
          {addGroupButton}
          {deleteButton}
        </ButtonGroup>,
        childNodes: criteriaToNodes(
          opts.onEditItem
            ? [...cg.criteria, { key: 'custom', query: '' }]
            : cg.criteria,
          { ...opts, path: [...path, idx] }),
      };

    } else {

      // Render leaf criterion

      const ci = c as Criterion;
      const { subregisters, itemClasses } = opts;
      if (!isCriteriaKey(ci.key)) {
        console.error("Invalid criteria key encountered", ci.key);
        throw new Error("Invalid criteria key encountered");
      }
      const cfg = CRITERIA_CONFIGURATION[ci.key];
      if (!cfg) {
        console.error("Missing criterion configuration for key", ci.key);
        throw new Error("Missing criterion configuration");
      }
      const Widget = cfg.widget;
      const data = cfg.fromQuery(ci.query, { subregisters, itemClasses });
      const criterionTypeOptions: OptionProps[] = Object.entries(CRITERIA_CONFIGURATION).
        map(([key, cfg]) => {
          return { value: key, label: cfg.label };
        });
      const isPlaceholder = ci.key === 'custom' && ci.query === '';
      const label = isPlaceholder
        ? <Button
              small
              minimal
              icon="plus"
              onClick={() => opts.onEditItem!(
                path,
                idx,
                { key: 'custom', query: cfg.toQuery({ customExpression: 'false' }, { subregisters, itemClasses }) },
                true)}>
            criteria
          </Button>
        : <ControlGroup vertical css={css`margin-bottom: 2.5px;`}>
            <Select
              options={criterionTypeOptions}
              value={ci.key}
              disabled={!opts.onEditItem}
              onChange={opts.onEditItem
                ? (evt) => {
                  if (evt.currentTarget.value !== '' && isCriteriaKey(evt.currentTarget.value)) {
                    opts.onEditItem!(
                      path,
                      idx,
                      { key: evt.currentTarget.value, query: '' }
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
                true)} />
          </ControlGroup>;
      return {
        id: `${path.join('-')}-${idx}-${opts.implied ? 'implied' : ''}`,
        disabled,
        label,
        secondaryLabel: <ButtonGroup>
          {deleteButton}
        </ButtonGroup>,
      };

    }

  });
}
