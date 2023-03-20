/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import log from 'electron-log';
import format from 'date-fns/format';
import React, { useContext } from 'react';
import { Helmet, HelmetProps } from 'react-helmet';
import { css, jsx } from '@emotion/react';
import { FormGroup, FormGroupProps, Colors } from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
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


export const RegisterHelmet: React.FC<HelmetProps> = function (props) {
  const { title: datasetTitle } = useContext(DatasetContext);

  return (
    <Helmet
        titleTemplate={`%s in ${datasetTitle} register`}
        defaultTitle={`${datasetTitle} register`}>
      {props.children}
    </Helmet>
  );
};


export const PropertyDetailView: React.FC<{
  title: FormGroupProps["label"]
  secondaryTitle?: FormGroupProps["labelInfo"]
  inline?: FormGroupProps["inline"]
}> = function ({ title, inline, children, secondaryTitle }) {
  return <FormGroup
      label={`${title}:`}
      labelInfo={secondaryTitle}
      css={css`&, &.bp4-inline { label.bp4-label { font-weight: bold; line-height: unset } }`}
      inline={inline}>
    {children}
  </FormGroup>;
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
      <div css={css`position: relative; flex: 1; padding: 10px; overflow-y: auto; background: ${Colors.GRAY5};`}>
        {main}
      </div>
    </div>
  )
}
