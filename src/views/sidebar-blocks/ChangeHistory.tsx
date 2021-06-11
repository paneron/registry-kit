/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useState } from 'react';
import { jsx, css } from '@emotion/react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { ValueHook } from '@riboseinc/paneron-extension-kit/types';


const ChangeHistory: React.FC<{ itemPath: string, selectedCRID?: string, onSelectCR?: (crID: string) => void }> =
function ({ itemPath, selectedCRID, onSelectCR }) {

  const { useFilteredIndex, useIndexDescription } = useContext(DatasetContext);

  const crIndex = useFilteredIndex({
    queryExpression: `return objPath.indexOf("/change-requests/") === 0 && obj.disposition !== 'notAccepted' && obj.disposition !== 'withdrawn' && obj.proposals["${itemPath}"] !== undefined`,
  });

  const crIndexStatus = useIndexDescription({ indexID: crIndex.value.indexID ?? '' }).value.status;

  const [selectedCRPosition, ] = useState<number>(-1); // -1 means no selection. ugh

  const positions = crIndex.value.indexID ? [...new Array(crIndexStatus.objectCount)].map((_, idx) => idx) : [];

  if (crIndex.value.indexID !== undefined) {
    return (<>
      {positions.map(pos =>
        <ChangeHistoryItem
          key={pos}
          itemPath={itemPath}
          indexID={crIndex.value.indexID!}
          position={pos}
          selected={selectedCRPosition === pos ? true : undefined}
        />
      )}
    </>);
  } else {
    return <>Loading…</>;
  }
};


const ChangeHistoryItem: React.FC<{ itemPath?: string, indexID: string, position: number, selected?: true, onSelect?: () => void }> =
function ({ itemPath, indexID, position, onSelect }) {
  const { useObjectData, useObjectPathFromFilteredIndex } = useContext(DatasetContext);

  const selectedCRPath = useObjectPathFromFilteredIndex({
    indexID: indexID,
    position: position,
  }).value.objectPath;

  const selectedCRDataRequest = useObjectData({
    objectPaths: selectedCRPath !== '' ? [selectedCRPath] : [],
  }) as ValueHook<{ data: Record<string, ChangeRequest | null> }>;

  const selectedCRData = (selectedCRPath
    ? selectedCRDataRequest.value.data[selectedCRPath]
    : null) as ChangeRequest | null;

  const proposal = (itemPath ? selectedCRData?.proposals?.[itemPath] : null) ?? null;

  if (selectedCRData) {
    return (
      <div css={css`margin-bottom: 5px; ${selectedCRData.disposition === undefined ? 'opacity: 0.5;' : ''}`}>
        {proposal
          ? <div><span css={css`font-size: 110%; font-weight: bold`}>{proposal.type}</span>, justified as:</div>
          : null}
        <div css={css`margin-left: 10px;`}>{selectedCRData.justification ?? 'N/A'}</div>
        <div css={css`font-size: 90%; font-weight: bold;`}>{selectedCRData.disposition ?? 'not submitted'}, {selectedCRData.status}</div>
        <div css={css`font-size: 90%;`}>{selectedCRData.timeDisposed ?? selectedCRData.timeProposed ?? selectedCRData.timeStarted}</div>
      </div>
    );
  } else {
    return <></>;
  }
}


export default ChangeHistory;
