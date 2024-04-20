/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx, css } from '@emotion/react';
import ErrorState from '@riboseinc/paneron-extension-kit/widgets/ErrorState';

import { BrowserCtx } from '../views/BrowserCtx';
import type { ProposalProps, ChangeProposal } from './types';


export const ProposalSummary: React.FC<ProposalProps<ChangeProposal>> =
function ({ proposal, itemRef, item, itemBefore, onChange }) {
  const { itemClasses } = useContext(BrowserCtx);
  const { classID } = itemRef;
  const cls = itemClasses[classID];
  const ListItemView = cls?.views?.listItemView;

  if (ListItemView) {
    return <span css={css`
      display: inline-flex;
      flex-flow: row nowrap;
      align-items: baseline;
    `}>
      <ListItemView
        itemRef={itemRef}
        itemData={item.data}
        css={css`text-overflow: ellipsis; overflow: hidden;`}
      />
      &emsp;
      <small>{cls.meta.title}</small>
    </span>;
  } else {
    return <ErrorState
      viewName="list item view"
      inline
      error="unable to load list item view"
    />;
  }
};


export default ProposalSummary;
