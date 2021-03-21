/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { css, jsx } from '@emotion/core';

//import log from 'electron-log';
import React from 'react';
import { ItemClassConfiguration, RelatedItemClassConfiguration } from '../types';
import { FormGroup, IFormGroupProps } from '@blueprintjs/core';
export { GenericRelatedItemView } from './GenericRelatedItemView';


export const PropertyDetailView: React.FC<{
  title: IFormGroupProps["label"]
  secondaryTitle?: IFormGroupProps["labelInfo"]
  inline?: IFormGroupProps["inline"]
}> = function ({ title, inline, children, secondaryTitle }) {
  return <FormGroup
      label={`${title}:`}
      labelInfo={secondaryTitle}
      css={css`&, &.bp3-inline { label.bp3-label { font-weight: bold; line-height: unset } }`}
      inline={inline}>
    {children}
  </FormGroup>;
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
