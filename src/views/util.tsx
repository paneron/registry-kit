/** @jsx jsx */
/** @jsxFrag React.Fragment */

//import log from 'electron-log';
import format from 'date-fns/format';
import React from 'react';
import { css, jsx } from '@emotion/react';
import { FormGroup, FormGroupProps } from '@blueprintjs/core';
import { ItemClassConfiguration, RelatedItemClassConfiguration } from '../types';
export { GenericRelatedItemView } from './GenericRelatedItemView';


export const PropertyDetailView: React.FC<{
  title: FormGroupProps["label"]
  secondaryTitle?: FormGroupProps["labelInfo"]
  inline?: FormGroupProps["inline"]
}> = function ({ title, inline, children, secondaryTitle }) {
  return <FormGroup
      label={`${title}:`}
      labelInfo={secondaryTitle}
      css={css`&, &.bp3-inline { label.bp3-label { font-weight: bold; line-height: unset } }`}
      inline={inline}>
    {children}
  </FormGroup>;
};


export const Datestamp: React.FC<{
  date: Date
  className?: string
}> = function ({ date, className }) {
  const asString = format(date, 'yyyy-MM-dd');
  return <span className={className} title={date.toString()}>{asString}</span>;
};


export const _getRelatedClass = (classes: Record<string, ItemClassConfiguration<any>>) => {
  return (clsID: string): RelatedItemClassConfiguration => {
    const cfg = classes[clsID];
    return {
      title: cfg.meta.title,
      itemView: cfg.views.listItemView,
    };
  };
};
