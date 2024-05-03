/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import log from 'electron-log';
import format from 'date-fns/format';
import { format as formatTZ, utcToZonedTime } from 'date-fns-tz';

import React, { memo, useContext } from 'react';
import { Helmet, type HelmetProps } from 'react-helmet';
import { css, jsx } from '@emotion/react';
import {
  Card, type CardProps,
  Classes,
  FormGroup, type FormGroupProps,
  H3, H4,
  Button as BaseButton, type ButtonProps,
  Menu, MenuDivider, MenuItem,
  ButtonGroup,
  Tag, type TagProps,
  Colors,
} from '@blueprintjs/core';
import { Popover2 as Popover } from '@blueprintjs/popover2';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import HelpTooltip, { type HelpTooltipProps } from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { BrowserCtx } from './BrowserCtx';
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
  const { registerMetadata } = useContext(BrowserCtx);

  return (
    <Helmet
        titleTemplate={`%s in ${registerMetadata?.name ?? datasetTitle}`}
        defaultTitle={`${registerMetadata?.name ?? datasetTitle}`}>
      {props.children}
    </Helmet>
  );
});


/**
 * A wrapper to show property data with its label(s).
 */
export const PropertyDetailView: React.FC<FormGroupProps & {
  /** @deprecated use `label` instead */
  title?: FormGroupProps["label"]
  /** @deprecated use `labelInfo` instead */
  secondaryTitle?: FormGroupProps["labelInfo"]
}> = function ({
    label, labelInfo,
    title, secondaryTitle,
    ...props }) {
  return (
    <FormGroup
      label={label || title ? `${label ?? title}:` : undefined}
      labelInfo={labelInfo ?? secondaryTitle}
      css={css`
        &, &.bp4-inline {
          label.bp4-label {
            /*
             * Since it’s in flex container, label expands to fill its width,
             * and due to the mechanics of how labels work (?)
             * any button (e.g., for deletion) within labelInfo
             * would responds to events of the entire label
             * (meaning you can hover space to the right of the label and labelInfo
             * and the button would still be clickable).
             * This makes the label not fill flex container width.
             */
            align-self: flex-start;

            font-weight: bold;
            line-height: unset;
            text-transform: capitalize;
            .bp4-text-muted {
              text-transform: none;
            }
          }
        }
      `}
      {...props}
    />
  );
};


/** Formats given date as a span with tooltip set to full ISO date & time. */
export const Datestamp: React.FC<{
  date: Date
  /** See formatDate(). */
  useUTC?: boolean
  /** See formatDate(). */
  showTime?: boolean
  /** See formatDate(). */
  showTimeIfNonZero?: boolean
  title?: string
  className?: string
}> = function ({ date, useUTC, showTime, showTimeIfNonZero, title, className }) {
  const asString = formatDate(date, { useUTC, showTime, showTimeIfNonZero });
  return <span
      className={className}
      title={`${title ? `${title}: ` : ''}${date?.toString() ?? 'N/A'}`}>
    {asString}
  </span>;
};


function formatInTimeZone(date: Date, fmt: string, tz: string) {
  return formatTZ(
    utcToZonedTime(date, tz), 
    fmt, 
    { timeZone: tz });
}

function timeIsNonZero(date: Date): boolean {
  return (
    date.getMilliseconds() === 0 &&
    date.getSeconds() === 0 &&
    date.getMinutes() === 0 &&
    date.getHours() === 0);
}


/** Foramts given date as plain text. */
export function formatDate(
  date: Date,
  opts?: {
    /** Show time in UTC. Will add the “UTC”, unless time is shown. */
    useUTC?: boolean
    /** Show date along with full time, to seconds. */
    showTime?: boolean
    /** Show time, unless it’s 00:00:00 on the day. */
    showTimeIfNonZero?: boolean
  },
): string {
  const showTime = opts?.showTime || (opts?.showTimeIfNonZero && timeIsNonZero(date));
  const fmt = showTime
    ? 'yyyy-MM-dd HH:mm:ss'
    : 'yyyy-MM-dd';
  try {
    return opts?.useUTC
      ? `${formatInTimeZone(date, fmt, 'UTC')}${showTime ? ' UTC' : ''}`
      : format(date, fmt);
  } catch (e) {
    console.error("Failed to format date", date, typeof date);
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


// /**
//  * Suitable for use as tab contents for TabbedWorkspace.
//  * Provides top bar with actions and main content.
//  */
// export const TabContentsWithActions: React.FC<{
//   actions: JSX.Element;
//   main: JSX.Element;
//   gapPx?: number;
//   className?: string;
// }> = function ({ actions, gapPx: _gapPx, main, className }) {
//   const gapPx = _gapPx ?? 10;
//   return (
//     <div css={css`
//       position: absolute; inset: 0;
//       display: flex; flex-flow: column nowrap;
//     `} className={className}>
//       <div css={css`flex: 0; padding: ${gapPx}px; display: flex; flex-flow: row wrap; gap: ${gapPx}px;`}>
//         {actions}
//       </div>
//       <div css={css`
//         position: relative;
//         flex: 1;
//         padding: ${gapPx}px;
//         overflow-y: auto;
//         background: ${Colors.GRAY5};
//         .bp4-dark & { background: ${Colors.DARK_GRAY2}; }
//       `}>
//         {main}
//       </div>
//     </div>
//   );
// };


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
  layoutOptions?: Record<string, unknown>
}
interface Grid extends TabContentsWithHeaderProps {
  layout: 'card-grid'
  layoutOptions?: {
    gapPx?: number
    stretch?: boolean
  }
}
interface Scrollable extends TabContentsWithHeaderProps {
  layout: 'scrollable'
  layoutOptions?: never
}
interface NoLayout extends TabContentsWithHeaderProps {
  layout?: undefined
  layoutOptions?: never
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
export const TabContentsWithHeader: React.FC<Grid | Scrollable | NoLayout> =
function ({ title, smallTitle, classification, actions, layout, layoutOptions, className, children }) {
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
        : <H3 css={css`margin: 0 ${paddingPx}px;`}>{title}</H3>}
      {hasClassification
        ? <div css={css`
            flex: 0;
            margin: 0 ${paddingPx}px;
            display: flex;
            flex-flow: row wrap;
            gap: ${paddingPx}px;
          `}>
            {classification!.map((p, idx) =>
              <Tag
                key={idx}
                minimal
                {...p}
                large={!smallTitle}
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
          ? `
              > :only-child { position: absolute; inset: 0 }
              box-shadow: black 0 0 20px -10px;
            `
          : `
              padding: 0 10px;
              &::after, &::before {
                pointer-events: none;
                content: " ";
                display: block;
                position: sticky;
                width: 100%;
                height: 1px;
                background: ${Colors.GRAY5};
                .bp4-dark & { background: ${Colors.DARK_GRAY2}; }
                z-index: 10;
              }
              &::before {
                top: 0;
                box-shadow: ${Colors.GRAY5} 0 -20px 20px 20px;
                .bp4-dark & {
                  box-shadow: ${Colors.DARK_GRAY2} 0 -20px 20px 20px;
                }
              }
              &::after {
                bottom: 0;
                box-shadow: ${Colors.GRAY5} 0 20px 20px 20px;
                .bp4-dark & {
                  box-shadow: ${Colors.DARK_GRAY2} 0 20px 20px 20px;
                }
              }
            `}

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
              ${layoutOptions?.stretch
                ? 'align-items: stretch;'
                : 'align-items: flex-start;'}
              gap: ${layoutOptions?.gapPx ?? 10}px;
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
            {actions!.map((props, idx) => {
              if (props.hasOwnProperty('length') && (props as ButtonProps[]).length !== undefined) {
                return (
                  <ButtonGroup key={idx}>
                    {(props as ButtonProps[]).map((p, idx) =>
                      <Action {...p} key={idx} />
                    )}
                  </ButtonGroup>
                );
              } else {
                return <Action key={idx} {...(props as ButtonProps)} />;
              }
            })}
          </div>
        : null}
    </div>
  );
};


export type ActionProps = ButtonProps & ({ popup?: JSX.Element, tooltip?: string });
/** Mostly a button, but with an optional popup. */
const Action: React.FC<ActionProps & { key?: number | string }> = function ({ popup, tooltip, ...props }) {
  const btn = <BaseButton
    {...props}
    intent={props.disabled ? undefined : props.intent}
    onClick={props.disabled ? undefined : props.onClick}
    disabled={props.active ? false : props.disabled}
    title={tooltip}
    rightIcon={popup ? 'more' : undefined}
  />;

  if (popup && !props.disabled) {
    return (
      <Popover key={props.key} content={popup} placement="top" minimal interactionKind="click">
        {btn}
      </Popover>
    );
  } else {
    return btn;
  }
};


export const CardInGrid: React.FC<{ description: string } & CardProps> =
function ({ description, className, ...props }) {
  return (
    <Card
      css={css`border-radius: 5px;`}
      title={description}
      className={!props.interactive
        ? `${Classes.ELEVATION_3} ${className ?? ''}`
        : className}
      {...props}
    />
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
      className={`${Classes.ELEVATION_3} ${props.className}`}
    />
  );
};


export const MoreMenu: React.FC<Record<never, never>> = memo(function ({ children }) {
  return (
    <Popover minimal content={<>{children}</>}>
      <BaseButton icon="more" small minimal />
    </Popover>
  );
});


export const ItemClassMenu: React.FC<{
  cfg: ItemClassConfiguration<any>;
  onCreate?: () => void;
}> = memo(function ({ cfg, onCreate }) {
  return (
    <Menu>
      <MenuDivider title="About this class" />
      <MenuItem multiline disabled css={css`max-width: 400px`} text={cfg.meta.description} />
      {onCreate
        ? <>
            <MenuDivider title="Quick actions" />
            <MenuItem
              text="Propose new"
              intent="primary"
              onClick={onCreate} icon="plus"
            />
          </>
        : null}
    </Menu>
  );
});
