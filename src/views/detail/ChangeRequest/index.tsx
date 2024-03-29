/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState, useContext, useMemo, memo, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button,
  Card,
  NonIdealState,
  Spinner,
  UL,
} from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { toJSONNormalized } from '@riboseinc/paneron-extension-kit/util';
import DL from '@riboseinc/paneron-extension-kit/widgets/DL';
import { BrowserCtx } from '../../BrowserCtx';
import { crPathToCRID } from '../../itemPathUtils';
import {
  ChangeRequestContextProvider,
  ChangeRequestContext,
} from '../../change-request/ChangeRequestContext';
import Proposals from '../../change-request/Proposals';
import TransitionOptions, { isFinalState, getTransitions } from '../../change-request/TransitionOptions';
import TransitionsAndStatus, { getTransitionHistory } from '../../change-request/TransitionHistory';
import Summary from '../../change-request/Summary';
import { type SomeCR, hadBeenProposed, isDisposed } from '../../../types/cr';
import { Protocols } from '../../protocolRegistry';
import {
  TabContentsWithHeader,
  type TabContentsWithHeaderProps,
  RegisterHelmet as Helmet,
  maybeEllipsizeString,
  Datestamp,
} from '../../util';


const View: React.VoidFunctionComponent<{ uri: string }> =
memo(function ({ uri }) {
  const crID = crPathToCRID(uri);
  return (
    <ChangeRequestContextProvider changeRequestID={crID}>
      <MaybeChangeRequest uri={uri} />
    </ChangeRequestContextProvider>
  );
});


const MaybeChangeRequest: React.VoidFunctionComponent<{ uri: string }> =
memo(function ({ uri }) {
  const { closeTabWithURI } = useContext(TabbedWorkspaceContext);
  const {
    changeRequest: cr,
    canTransition,
    deleteCR,
    updateItemProposal,
  } = useContext(ChangeRequestContext);

  const handleDelete = useCallback(
    (async () => {
      if (deleteCR) {
        await deleteCR();
        closeTabWithURI(`${Protocols.CHANGE_REQUEST}:${uri}`);
      }
    }),
    [deleteCR, closeTabWithURI]);

  const handleDeleteProposalAtItemPath = useCallback(
    async function handleDeleteProposalAtItemPath(itemPath: string) {
      return await updateItemProposal?.("remove proposed change from proposal draft", null, itemPath);
    },
    [updateItemProposal],
  );

  return (cr
    ? <ChangeRequestDetails
        cr={cr}
        canTransition={canTransition}
        onDelete={deleteCR
          ? handleDelete
          : undefined}
        onDeleteProposalForItemAtPath={updateItemProposal
          ? handleDeleteProposalAtItemPath
          : undefined}
        css={css`
          position: absolute;
          inset: 0;
          overflow-y: auto;
        `}
      />
    : <NonIdealState
        icon={<Spinner />}
        css={css`
          position: absolute;
          inset: 0;
          overflow-y: auto;
        `}
        description={"Unable to load proposal"}
      />
  );
});


const ChangeRequestDetails: React.VoidFunctionComponent<{
  cr: SomeCR,
  canTransition: boolean,
  onDelete?: () => void,
  onDeleteProposalForItemAtPath?: (itemPath: string) => void,
  className?: string,
}> = memo(function ({ cr, canTransition, onDelete, onDeleteProposalForItemAtPath, className }) {
  const {
    activeChangeRequestID,
    setActiveChangeRequestID,
    stakeholder,
    registerMetadata,
  } = useContext(BrowserCtx);

  const helmet = useMemo((() =>
    <Helmet>
      <title>Viewing proposal: {cr.justification ?? "N/A"}</title>
    </Helmet>
  ), [cr.justification]);

  const isActive = activeChangeRequestID === cr.id;
  const anotherIsActive = activeChangeRequestID && activeChangeRequestID !== cr.id;

  const crItemEntries = Object.entries(cr.items).map(i => JSON.stringify(i));
  const hasItems = crItemEntries.length > 0;

  const [selectedProposal, selectProposal] = useState<string | null>(null);
  const proposals = useMemo((() =>
    hasItems
      ? <Proposals
          proposals={cr.items}
          selectedItem={selectedProposal}
          onSelectItem={selectProposal}
          onDeleteProposalForItemAtPath={onDeleteProposalForItemAtPath}
        />
      : <NonIdealState
          icon="clean"
          title="Nothing is proposed here yet."
          description={onDelete
            ? <Button onClick={onDelete}>
                Delete this CR draft
              </Button>
            : undefined}
        />
  ), [onDelete, onDeleteProposalForItemAtPath, selectedProposal, selectProposal, hasItems]);

  const classification = useMemo(() => {
    const classification: TabContentsWithHeaderProps["classification"] = [];
    classification.push({
      icon: 'lightbulb',
      children: "Proposal",
      tooltip: {
        icon: 'info-sign',
        content: <UL css={css`margin: 0;`}><li>Proposal ID: {cr.id}</li></UL>,
      },
    });
    classification.push({
      children: cr.state?.replaceAll('-', ' ') || 'N/A',
      tooltip: {
        icon: 'history',
        content: <UL css={css`margin: 0;`}>
          <li>Edited: <Datestamp date={cr.timeEdited} /></li>
          <li>Proposed: {hadBeenProposed(cr) ? <Datestamp date={cr.timeProposed} /> : 'not yet'}</li>
          <li>Disposed: {isDisposed(cr) ? <Datestamp date={cr.timeDisposed} /> : 'not yet'}</li>
        </UL>,
      },
      intent: cr.state === 'accepted'
        ? 'success'
        : cr.state === 'returned-for-clarification'
          ? 'warning'
          : cr.state === 'withdrawn' || cr.state === 'rejected'
            ? 'danger'
            : cr.state === 'draft'
              ? undefined
              : 'primary',
    });
    return classification;
  }, [toJSONNormalized(cr)]);

  const actions = useMemo(() => {
    const actions: TabContentsWithHeaderProps["actions"] = [];
    const handleChangeActiveStatus = !anotherIsActive && setActiveChangeRequestID
      ? ((active: boolean) => active
          ? setActiveChangeRequestID?.(cr.id)
          : setActiveChangeRequestID?.(null)
        )
      : undefined;
    //const htmlTitle = anotherIsActive
    //  ? "You are in another proposal so you can’t enter this one. "
    //  : canEdit && !isActive
    //    ? "Enter proposal to preview or add to proposed changes. "
    //    : !isActive
    //      ? "Enter proposal to preview the register as proposed."
    //      : "You’re previewing the register with this proposal applied."
    if (handleChangeActiveStatus && isActive) {
      actions.push({
        children: "Exit proposal",
        intent: 'warning',
        disabled: !handleChangeActiveStatus,
        onClick: () => handleChangeActiveStatus?.(false)
        //title: htmlTitle,
      });
    } else {
      actions.push({
        children: "Work on this proposal",
        intent: 'primary',
        disabled: !handleChangeActiveStatus,
        onClick: () => handleChangeActiveStatus?.(true)
        //title: htmlTitle,
      });
    }
    return actions;
  }, [isActive, anotherIsActive]);

  return (
    <TabContentsWithHeader
        className={className}
        title={maybeEllipsizeString(cr.justification, 70)}
        classification={classification}
        layout="card-grid"
        layoutOptions={{ stretch: true }}
        actions={actions}>

      {helmet}

      {proposals}

      <Card elevation={1} css={css`flex: 100%; padding: 11px;`}>
        <DL>
          <Summary
            cr={cr}
            currentStakeholder={stakeholder}
            registerMetadata={registerMetadata ?? undefined}
          />
        </DL>
      </Card>

      <Card elevation={1} css={css`flex: calc(50% - 10px); flex-grow: 1; padding: 11px;`}>
        <TransitionsAndStatus
          pastTransitions={getTransitionHistory(cr)}
          isFinal={isFinalState(cr.state)}
        />
      </Card>

      {canTransition
        ? <Card elevation={3} css={css`flex: calc(50% - 10px); flex-grow: 1; padding: 11px;`}>
            <TransitionOptions
              transitions={stakeholder ? getTransitions(cr, stakeholder) : []}
              stakeholder={stakeholder}
              cr={cr}
            />
          </Card>
        : null}
    </TabContentsWithHeader>
  );
});


const CRTitle: React.FC<{ uri: string }> = memo(function ({ uri }) {
  const { useObjectData } = useContext(DatasetContext);
  const justification = useObjectData({ objectPaths: [uri] }).value.data?.[uri]?.justification;
  return <>Proposal “{maybeEllipsizeString(justification ?? uri)}”</>;
});

export default { main: View, title: CRTitle };
