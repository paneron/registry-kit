/** @jsx jsx */
/** @jsxFrag React.Fragment */

import { jsx } from '@emotion/react';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Drawer } from '@blueprintjs/core';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import makeSearchResultList from '@riboseinc/paneron-extension-kit/widgets/SearchResultList';
import type { InternalItemReference } from '../types';
import { type SomeCR, hasSubmitterInput, isDisposed, hadBeenProposed } from '../types/cr';
import { isProposal } from '../types/proposal';
import { ProposalType } from './change-request/Proposals';
import { Datestamp } from '../views/util';
import { DISPOSED_CR_QUERY } from './sidebar/Registration';
import { Protocols } from './protocolRegistry';


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
  const query = `return (${DISPOSED_CR_QUERY}) && obj.items["${itemPath}"] !== undefined`;
  return (
    <Drawer
        isOpen={isOpen}
        onClose={onClose}
        enforceFocus={false}
        size="50vw"
        style={{ padding: '0', width: 'unset' }}>
      <ProposalList
	queryExpression={query}
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
  console.debug("Extra data", extraData);
  const change_ = extraData?.itemPath ? objectData.items[extraData?.itemPath] : undefined;
  const change = isProposal(change_) ? change_ : null;
  return <span title={`${justification} (proposal ID: ${objectData.id})`}>
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
