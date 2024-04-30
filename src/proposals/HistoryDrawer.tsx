/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Drawer } from '@blueprintjs/core';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import makeSearchResultList from '@riboseinc/paneron-extension-kit/widgets/SearchResultList';
import type { InternalItemReference } from '../types';
import { type SomeCR, State, hasSubmitterInput, isDisposed, hadBeenProposed } from '../proposals/types';
import { isProposal } from '../proposals/types';
import { ProposalType } from './ProposalType';
import { Datestamp } from '../views/util';
import { DISPOSED_CR_QUERY } from './queries';
import { Protocols } from '../views/protocolRegistry';


/** History of changes affecting given item. */
const ProposalHistoryDrawer: React.FC<{
  itemPath: string
  isOpen: boolean
  onClose: () => void
  onChooseItem?: (itemRef: InternalItemReference) => void
}> = function ({
  itemPath,
  isOpen, onClose,
}) {
  const { spawnTab } = useContext(TabbedWorkspaceContext);
  const [ selectedItemPath, setSelectedItemPath ] = useState<string | null>(null);
  // Return disposed CRs
  // that were either accepted or accepted on appeal
  // and have the item in question.
  const query = `return (
    (${DISPOSED_CR_QUERY})
    && (obj.state === "${State.ACCEPTED}" || obj.state === "${State.ACCEPTED_ON_APPEAL}")
    && obj.items["${itemPath}"] !== undefined
  )`;
  return (
    <Drawer
        isOpen={isOpen}
        onClose={onClose}
        enforceFocus={false}
        size="50vw"
        style={{ padding: '0', width: 'unset' }}>
      <ProposalList
	queryExpression={query}
	keyExpression="(new Date()).getTime() * 100 - (typeof obj.timeDisposed === 'object' ? (obj.timeDisposed ?? new Date()) : new Date(obj.timeDisposed)).getTime() + Math.floor(Math.random() * 1000)"
	selectedItemPath={selectedItemPath}
	onSelectItem={setSelectedItemPath}
	onOpenItem={useCallback((itemPath =>
	  spawnTab(`${Protocols.CHANGE_REQUEST}:${itemPath}`)
	), [spawnTab])}
	extraItemViewData={useMemo(() => ({ itemPath }), [itemPath])}
      />
    </Drawer>
  );
};


const ProposalHistoryItem: React.FC<{
  objectData: SomeCR,
  extraData?: { itemPath: string },
  objectPath: string,
}> = function ({ objectData, extraData }) {
  const justification = hasSubmitterInput(objectData) ? objectData.justification : 'N/A';
  const change_ = extraData?.itemPath ? objectData.items[extraData?.itemPath] : undefined;
  const change = isProposal(change_) ? change_ : null;
  return <span title={`Accepted proposal “${justification}” (proposal ID: ${objectData.id})`}>
    {change ? <ProposalType proposal={change} /> : null}
    {isDisposed(objectData)
      ? <><Datestamp date={objectData.timeDisposed} title="Disposed" />: </>
      : hadBeenProposed(objectData)
        ? <><Datestamp date={objectData.timeProposed} title="Proposed" />: </>
        : null}
    {justification}
  </span>;
};


const ProposalList = makeSearchResultList<SomeCR, { itemPath: string }>(ProposalHistoryItem, (objPath) => ({
  name: 'Prp.',
  iconProps: {
    icon: 'lightbulb',
    title: objPath,
    htmlTitle: `icon for proposal at ${objPath}`,
  },
}));


export default ProposalHistoryDrawer;
