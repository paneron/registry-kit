/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { memo } from 'react';
import { jsx, css } from '@emotion/react';
import { Classes, Colors } from '@blueprintjs/core';

import { InlineDiffGeneric } from '../views/diffing/InlineDiff';
import useItemClassConfig from '../views/hooks/useItemClassConfig';
import { ItemDetail } from '../views/detail/RegisterItem';

import type { ProposalProps, ChangeProposal } from './types';


export const ProposalDetail: React.FC<ProposalProps<ChangeProposal>> =
memo(function ({ proposal, showDiff, showOnlyChanged, itemRef, item, itemBefore, onChange }) {
  const itemClass = useItemClassConfig(itemRef.classID ?? 'NONEXISTENT_CLASS_ID');

  if (!itemClass) {
    throw new Error(`Unknown item class “${itemRef.classID}”!`);
  }

  const view: JSX.Element = showDiff
    ? <InlineDiffGeneric
        item1={itemBefore ?? {}}
        item2={item}
        css={css`
          position: absolute; inset: 0; padding: 10px; overflow: auto;
          background-color: white;
          .bp4-dark & {
            background-color: ${Colors.DARK_GRAY2};
          }
        `}
        className={`${Classes.ELEVATION_2} ${Classes.RUNNING_TEXT}`}
      />
    : <ItemDetail
        itemRef={itemRef}
        item={item}
        itemBefore={itemBefore}
        itemClass={itemClass}
        key={JSON.stringify(itemRef)}
        compactHeader
      />;

  return <div css={css`position: absolute; inset: 0; display: flex; flex-flow: column;`}>
    {view}
  </div>;
});

export default ProposalDetail;
