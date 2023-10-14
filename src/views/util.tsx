/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import log from 'electron-log';
import format from 'date-fns/format';
import React, { memo, useContext } from 'react';
import { Helmet, type HelmetProps } from 'react-helmet';
import { css, jsx } from '@emotion/react';
import {
  Card,
  Classes,
  FormGroup, type FormGroupProps,
  H2, H4,
  Button as BaseButton, type ButtonProps,
  ButtonGroup,
  Tag, type TagProps,
  Colors,
} from '@blueprintjs/core';
import { Popover2 as Popover } from '@blueprintjs/popover2';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import HelpTooltip, { type HelpTooltipProps } from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import type { ItemClassConfiguration, RelatedItemClassConfiguration } from '../types';
export { GenericRelatedItemView } from './GenericRelatedItemView';


/**
 * Get give string truncated & with ellipsis appended
 * if its length exceeds given number of characters.
 */
export function maybeEllipsizeString(
  str: string,
  maxLength: number = 20,
): string {
  return str.length > maxLength
    ? `${str.slice(0, maxLength)}…`
    : str;
}


export const RegisterHelmet: React.FC<HelmetProps> = memo(function (props) {
  const { title: datasetTitle } = useContext(DatasetContext);

  return (
    <Helmet
        titleTemplate={`%s in ${datasetTitle} register`}
        defaultTitle={`${datasetTitle} register`}>
      {props.children}
    </Helmet>
  );
});


export const PropertyDetailView: React.FC<{
  title: FormGroupProps["label"]
  secondaryTitle?: FormGroupProps["labelInfo"]
  inline?: FormGroupProps["inline"]
  className?: string
}> = function ({ title, secondaryTitle, inline, children, className }) {
  return (
    <FormGroup
        label={`${title}:`}
        labelInfo={secondaryTitle}
        css={css`&, &.bp4-inline { label.bp4-label { font-weight: bold; line-height: unset } }`}
        className={className}
        inline={inline}>
      {children}
    </FormGroup>
  );
};


/** Formats given date as a span with tooltip set to full ISO date & time. */
export const Datestamp: React.FC<{
  date: Date
  title?: string
  className?: string
}> = function ({ date, title, className }) {
  const asString = formatDate(date);
  return <span
      className={className}
      title={`${title ? `${title}: ` : ''}${date?.toString() ?? 'N/A'}`}>
    {asString}
  </span>;
};


/** Foramts given date as plain text. */
export function formatDate(date: Date): string {
  try {
    return format(date, 'yyyy-MM-dd');
  } catch (e) {
    return `Invalid date (${e})`;
  }
}


export const _getRelatedClass = (classes: Record<string, ItemClassConfiguration<any>>) => {
  return (clsID: string): RelatedItemClassConfiguration => {
    const cfg = classes[clsID];
    return {
      title: cfg.meta.title,
      // TODO: The itemView/listItemView inconsistency is annoying
      itemView: cfg.views.listItemView,
    };
  };
};


/**
 * Suitable for use as tab contents for TabbedWorkspace.
 * Provides top bar with actions and main content.
 */
export const TabContentsWithActions: React.FC<{
  actions: JSX.Element;
  main: JSX.Element;
  className?: string;
}> = function ({ actions, main, className }) {
  return (
    <div css={css`
      position: absolute; inset: 0;
      display: flex; flex-flow: column nowrap;
    `} className={className}>
      <div css={css`flex: 0; padding: 10px; display: flex; flex-flow: row wrap; gap: 10px;`}>
        {actions}
      </div>
      <div css={css`
        position: relative;
        flex: 1;
        padding: 10px;
        overflow-y: auto;
        background: ${Colors.GRAY5};
        .bp4-dark & { background: ${Colors.DARK_GRAY2}; }
      `}>
        {main}
      </div>
    </div>
  );
};


export type ClassificationEntry = TagProps & { tooltip?: HelpTooltipProps };
export interface TabContentsWithHeaderProps {
  title: JSX.Element | string
  smallTitle?: boolean
  classification?: ClassificationEntry[]
  actions?: (ActionProps | ActionProps[])[]
  tooltip?: HelpTooltipProps
  className?: string

  /**
   * CSS to apply to child contents wrapper div.
   *
   * If 'card-grid', children would be expected to be cards
   * (e.g., `FormGroupAsCardInGrid` or `CardInGrid`)
   *
   * 'card-grid' implies 'scrollable'.
   */
  layout?: undefined | 'card-grid' | 'scrollable'
}
const paddingPx = 11;
function findEnabledActions
<T extends ButtonProps | ButtonProps[] = ButtonProps | ButtonProps[]>
(props: T[]): ButtonProps[] {
  return props.map(props =>
    (props as ButtonProps[]).length !== undefined
      ? (props as ButtonProps[]).filter(p => !p.disabled)
      : !(props as ButtonProps).disabled
        ? props
        : []
  ).flat();
}
export const TabContentsWithHeader: React.FC<TabContentsWithHeaderProps> =
function ({ title, smallTitle, classification, actions, className, layout, children }) {
  const hasClassification = (classification ?? []).length > 0;

  const enabledActions = actions ? findEnabledActions(actions) : [];
  const hasActions = enabledActions.length > 0;

  // if (enabledActions.length === 1 && !enabledActions[0].intent) {
  //   enabledActions[0].intent = 'primary';
  // }

  return (
    <div css={css`
      position: absolute; inset: 0;
      padding-top: ${paddingPx}px;
      ${hasActions ? `padding-bottom: ${paddingPx}px;` : ''}
      display: flex; flex-flow: column nowrap;
      gap: ${paddingPx}px;
    `} className={className}>
      {smallTitle
        ? <H4 css={css`margin: 0 ${paddingPx}px;`}>{title}</H4>
        : <H2 css={css`margin: 0 ${paddingPx}px;`}>{title}</H2>}
      {hasClassification
        ? <div css={css`
            flex: 0;
            margin: 0 ${paddingPx}px;
            display: flex;
            flex-flow: row wrap;
            gap: ${paddingPx}px;
          `}>
            {classification!.map(p =>
              <Tag
                {...p}
                rightIcon={p.tooltip
                  ? <HelpTooltip {...p.tooltip} />
                  : undefined}
              />
            )}
          </div>
        : null}
      <div css={css`
        position: relative;
        flex: 1;
        overflow-y: auto;

        ${layout === undefined
          ? `> :only-child { position: absolute; inset: 0 }`
          : 'padding: 10px;'}

        ${layout === 'scrollable' || layout === 'card-grid'
          ? `
              background: ${Colors.GRAY5};
              .bp4-dark & { background: ${Colors.DARK_GRAY2}; }
            `
          : ''}

        ${layout === 'card-grid'
          ? `
              display: flex;
              flex-flow: row wrap;
              align-content: flex-start;
              align-items: flex-start;
              gap: 10px;
            `
          : ''}
      `}>
        {children}
      </div>

      {hasActions
        ? <div css={css`
            margin: 0 ${paddingPx}px;
            flex: 0; display: flex; flex-flow: row wrap; gap: ${paddingPx}px;
          `}>
            {actions!.map(props => {
              if (props.hasOwnProperty('length') && (props as ButtonProps[]).length !== undefined) {
                return (
                  <ButtonGroup>
                    {(props as ButtonProps[]).map(p =>
                      <Action {...p} />
                    )}
                  </ButtonGroup>
                );
              } else {
                return <Action {...(props as ButtonProps)} />;
              }
            })}
          </div>
        : null}
    </div>
  );
};


export type ActionProps = ButtonProps & { popup?: JSX.Element };
/** Mostly a button, but with an optional popup. */
const Action: React.FC<ActionProps> = function ({ popup, ...props }) {
  const btn = <BaseButton
    {...props}
    intent={props.disabled ? undefined : props.intent}
    onClick={props.disabled ? undefined : props.onClick}
    disabled={props.active ? false : props.disabled}
  />;

  if (popup && !props.disabled) {
    return (
      <Popover content={popup} placement="top">
        {btn}
      </Popover>
    );
  } else {
    return btn;
  }
};
export const CardInGrid: React.FC<Record<never, never>> = function ({ children }) {
  return (
    <Card
        css={css`border-radius: 5px;`}
        className={Classes.ELEVATION_3}>
      {children}
    </Card>
  );
};


/** Useful in case of tab “card-grid” layout. */
export const FormGroupAsCardInGrid: React.FC<FormGroupProps & { paddingPx?: number }> =
function ({ paddingPx, ...props }) {
  const paddingPx_ = paddingPx ?? 11;
  return (
    <FormGroup
      {...props}
      css={css`
        margin: 0;

        border-radius: 5px;
        padding: ${paddingPx_}px;

        > label.bp4-label {
          font-weight: bold;
          margin-bottom: ${paddingPx_}px;
        }
        > .bp4-form-content {
          display: flex;
          flex-flow: column nowrap;
          gap: ${paddingPx_}px;

          > .bp4-form-group {
            margin: 0;
          }
        }

        /* Note: these colors are picked to work with some form widgets, date input widget specifically. */
        background: ${Colors.WHITE};
        .bp4-dark & { background: ${Colors.DARK_GRAY3}; }
      `}
      className={Classes.ELEVATION_3}
    />
  );
};
