/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useMemo, memo, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button,
  Card,
  Colors,
  NonIdealState,
  Spinner,
  UL,
} from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { JSONStringifyNormalized } from '@riboseinc/paneron-extension-kit/util';
import { BrowserCtx } from '../../BrowserCtx';
import { crPathToCRID, crIDToCRPath } from '../../itemPathUtils';
import {
  ChangeRequestContextProvider,
  ChangeRequestContext,
} from '../../change-request/ChangeRequestContext';
import Proposals from '../../change-request/Proposals';
import TransitionOptions from '../../change-request/TransitionOptions';
import PastTransitions from '../../change-request/PastTransitions';
import { type SomeCR, type Proposed, hadBeenProposed, isDisposed } from '../../../types/cr';
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
  const { changeRequest: cr, canDelete, canTransition } = useContext(ChangeRequestContext);
  const handleAfterDelete = useCallback(
    (() => closeTabWithURI(`${Protocols.CHANGE_REQUEST}:${uri}`)),
    [closeTabWithURI]);

  return (cr
    ? <ChangeRequestDetails
        cr={cr}
        canTransition={canTransition}
        canDelete={canDelete}
        css={css`
          position: absolute;
          inset: 0;
          overflow-y: auto;
        `}
        afterDelete={handleAfterDelete}
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
  canDelete: boolean,
  afterDelete?: () => void,
  className?: string,
}> = memo(function ({ cr, canTransition, canDelete, afterDelete, className }) {
  const { performOperation, updateTree } = useContext(DatasetContext);
  const {
    activeChangeRequestID,
    setActiveChangeRequestID,
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
  const crItemMemo = crItemEntries.toString();

  const handleDelete = useMemo((() =>
    canDelete && updateTree && !isActive && !hasItems && !(cr as Proposed).timeProposed
    ? performOperation('deleting proposal', async function handleDelete() {
        const subtreeRoot = crIDToCRPath(cr.id).replace('/main.yaml', '');
        await updateTree({ subtreeRoot, newSubtreeRoot: null, commitMessage: 'remove CR draft' });
        afterDelete?.();
      })
    : undefined
  ), [isActive, hasItems, canDelete, cr.id, (cr as Proposed).timeProposed, afterDelete, updateTree]);

  const proposals = useMemo((() =>
    hasItems
      ? <Proposals proposals={cr.items} css={css`flex: 1;`} />
      : <NonIdealState
          icon="clean"
          title="Nothing is proposed here yet."
          description={handleDelete
            ? <Button onClick={handleDelete}>
                Delete this CR draft
              </Button>
            : undefined}
        />
  ), [
    handleDelete,
    hasItems,
    crItemMemo,
  ]);

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
  }, [JSONStringifyNormalized(cr)]);

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
        actions={actions}>

      {helmet}

      <Card elevation={0} css={css`
        flex: 100%;
        background: ${Colors.LIGHT_GRAY3};
        padding: 0;
        display: flex;
        min-height: 70vh;
      `}>
        {proposals}
      </Card>

      <Card elevation={1} css={css`flex: 30%; padding: 11px;`}>

      </Card>

      <Card elevation={1} css={css`flex: 30%; padding: 11px;`}>
        <PastTransitions cr={cr} />
      </Card>

      {canTransition
        ? <Card elevation={3} css={css`flex: 30%; padding: 11px;`}>
            <TransitionOptions cr={cr} />
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
