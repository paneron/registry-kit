/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext } from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button,
  Card,
  FormGroup,
  Colors,
  NonIdealState,
  Spinner,
  H5,
  UL,
  Tag,
  Divider,
  Classes,
} from '@blueprintjs/core';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { TabbedWorkspaceContext } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/context';
import { BrowserCtx } from '../../BrowserCtx';
import { crPathToCRID, crIDToCRPath } from '../../itemPathUtils';
import {
  ChangeRequestContextProvider,
  ChangeRequestContext,
} from '../../change-request/ChangeRequestContext';
import Proposals from '../../change-request/Proposals';
import { Proposed, hadBeenProposed, isDisposed } from '../../../types/cr';
import { RegisterStakeholderListItem } from '../../RegisterStakeholder';
import { Protocols } from '../../protocolRegistry';
import {
  TabContentsWithActions,
  RegisterHelmet as Helmet,
  maybeEllipsizeString,
  Datestamp,
} from '../../util';
import { TransitionOptions, getPastTransitions, getTransitions } from './transitions';


const View: React.FC<{ uri: string }> = function ({ uri }) {
  const crID = crPathToCRID(uri);
  const { closeTabWithURI } = useContext(TabbedWorkspaceContext);

  return (
    <ChangeRequestContextProvider changeRequestID={crID}>
      <ChangeRequestDetails
        css={css`
          position: absolute;
          inset: 0;
          overflow-y: auto;
        `}
        afterDelete={() => {
          closeTabWithURI(`${Protocols.CHANGE_REQUEST}:${uri}`);
        }}
      />
    </ChangeRequestContextProvider>
  );
};


const ChangeRequestDetails:
React.VoidFunctionComponent<{ afterDelete?: () => void, className?: string }> =
function ({ afterDelete, className }) {
  const { changeRequest: cr, canEdit } = useContext(ChangeRequestContext);
  const { performOperation, updateTree } = useContext(DatasetContext);
  const {
    registerMetadata,
    stakeholder,
    activeChangeRequestID,
    setActiveChangeRequestID,
  } = useContext(BrowserCtx);

  const helmet = 
    <Helmet>
      <title>Viewing proposal: {cr?.justification ?? "N/A"}</title>
    </Helmet>;

  if (cr) {
    const isActive = activeChangeRequestID === cr.id;
    const anotherIsActive = activeChangeRequestID && activeChangeRequestID !== cr.id;
    const canTransition = stakeholder && getTransitions(cr, stakeholder).length > 0;

    const crStakeholder = (registerMetadata?.stakeholders ?? []).
      find(s => s.gitServerUsername === cr.submittingStakeholderGitServerUsername);

    const authorIsCurrentUser = (
      stakeholder?.gitServerUsername &&
      cr.submittingStakeholderGitServerUsername === stakeholder.gitServerUsername);

    async function handleDelete() {
      if (authorIsCurrentUser && cr && updateTree && !isActive && Object.keys(cr.items).length < 1) {
        const subtreeRoot = crIDToCRPath(cr.id).replace('/main.yaml', '');
        await updateTree({ subtreeRoot, newSubtreeRoot: null, commitMessage: 'remove CR draft' });
        afterDelete?.();
      }
    }

    return (
      <TabContentsWithActions
        className={className}
        actions={<>
          <FormGroup
              inline
              labelInfo={<HelpTooltip
                icon='info-sign'
                content={<UL><li>Proposal ID: {cr.id}</li></UL>}
              />}
              label={<strong>Proposal</strong>}
              css={css`margin: 0; .bp4-form-content { display: flex; flex-flow: row wrap; gap: 10px; }`}>
            <CRActivation
              isActive={isActive}
              htmlTitle={anotherIsActive
              ? "You are in another proposal so you can’t enter this one. "
              : canEdit && !isActive
                ? "Enter proposal to preview or add to proposed changes. "
                : !isActive
                  ? "Enter proposal to preview the register as proposed."
                  : "You’re previewing the register with this proposal applied."}
              onChangeActiveStatus={!anotherIsActive && setActiveChangeRequestID
                ? ((active) => active
                    ? setActiveChangeRequestID?.(cr.id)
                    : setActiveChangeRequestID?.(null)
                  )
                : undefined}
            />
          </FormGroup>
        </>}
        main={
          <div
              css={css`
                display: flex;
                flex-flow: row wrap;
                padding: 10px;
                gap: 10px;
                align-content: flex-start;
                align-items: flex-start;
              `}
              className={className}>
            {helmet}

            <Card elevation={0} css={css`
              flex: 100%;
              background: ${Colors.LIGHT_GRAY3};
              padding: 11px;
              display: flex;
              min-height: 70vh;
            `}>
              {Object.keys(cr.items).length > 0
                ? <Proposals proposals={cr.items} css={css`flex: 1;`} />
                : <NonIdealState
                    icon="clean"
                    title="Nothing is proposed here yet."
                    description={authorIsCurrentUser && updateTree && !(cr as Proposed).timeProposed && !isActive
                      ? <Button onClick={performOperation('deleting proposal', handleDelete)} intent="danger">
                          Delete this CR draft
                        </Button>
                      : undefined}
                  />}
            </Card>

            <Card elevation={1} css={css`flex: 30%; padding: 11px;`}>

              {crStakeholder
                ? <div>
                    Author: <RegisterStakeholderListItem
                      stakeholder={crStakeholder}
                      isCurrentUser={authorIsCurrentUser || undefined}
                    />
                  </div>
                : null}

              <Divider />
              <div>
                Register&nbsp;version before&nbsp;proposal: <strong>{cr.registerVersion ?? 'N/A'}</strong>
                &ensp;
                {cr.registerVersion === registerMetadata?.version?.id
                  ? <Tag css={css`display: inline;`} intent='success' minimal round>
                      current
                      {" "}
                      <HelpTooltip intent='success' content={<>
                        Published version of the register
                        {" "}
                        had not changed since this proposal started.
                      </>} />
                    </Tag>
                  : <Tag css={css`display: inline;`} intent='warning' minimal round>
                      not current
                      {" "}
                      <HelpTooltip intent='warning' icon='warning-sign' content={<>
                        Register is currently at version <strong>{registerMetadata?.version?.id ?? 'N/A'}</strong>,
                        {" "}
                        which is different from version proposal author may have had in mind.
                        {" "}
                        It is recommended that proposed changes are reviewed to avoid unintentionally
                        {" "}
                        undoing a prior change.
                      </>} />
                    </Tag>}
              </div>
              <Divider />
              <div>Edited: <Datestamp date={cr.timeEdited} /></div>
              <Divider />
              <div>Proposed: {hadBeenProposed(cr) ? <Datestamp date={cr.timeProposed} /> : 'not yet'}</div>
              <Divider />
              <div>Disposed: {isDisposed(cr) ? <Datestamp date={cr.timeDisposed} /> : 'not yet'}</div>
              <Divider />

              <H5>
                {cr.state?.replaceAll('-', ' ') || 'N/A'}
              </H5>
            </Card>

            <Card elevation={1} css={css`flex: 30%; padding: 11px;`}>
              {getPastTransitions(cr).map(([key, el], idx) =>
                <React.Fragment key={key}>
                  {idx !== 0 ? <Divider /> : null}
                  <FormGroup label={`${key}:`}>
                    <div
                        css={css`white-space: pre-wrap;`}
                        className={Classes.RUNNING_TEXT}>
                      {el}
                    </div>
                  </FormGroup>
                </React.Fragment>
              )}
            </Card>

            {canTransition
              ? <Card elevation={3} css={css`flex: 30%; padding: 11px;`}>
                  <TransitionOptions cr={cr} />
                </Card>
              : null}
          </div>}
      />
    );
  } else {
    return <NonIdealState
      icon={<Spinner />}
      className={className}
      description={helmet}
    />;
  }
};


const CRActivation: React.FC<{
  isActive: boolean;
  htmlTitle?: string;

  /** Labels for the “activate” and “deactivate” buttons. */
  labels?: { activate?: string, deactivate?: string };

  onChangeActiveStatus?: (newStatus: boolean) => void;
}> = function ({ isActive, htmlTitle, labels, onChangeActiveStatus }) {
  return onChangeActiveStatus && isActive
    ? <Button
          title={htmlTitle}
          intent="warning"
          disabled={!onChangeActiveStatus}
          onClick={() => onChangeActiveStatus?.(false)}>
        {labels?.deactivate ?? "Exit proposal"}
      </Button>
    : <Button
          title={htmlTitle}
          intent={onChangeActiveStatus ? 'primary' : undefined}
          disabled={!onChangeActiveStatus}
          onClick={() => onChangeActiveStatus?.(true)}>
        {labels?.activate ?? "Work on this proposal"}
      </Button>;
};


const CRTitle: React.FC<{ uri: string }> = function ({ uri }) {
  const { useObjectData } = useContext(DatasetContext);
  const justification = useObjectData({ objectPaths: [uri] }).value.data?.[uri]?.justification;
  return <>Proposal “{maybeEllipsizeString(justification ?? uri)}”</>;
}

export default { main: View, title: CRTitle, plainTitle: async (uri: string) => `proposal ${uri}` };
