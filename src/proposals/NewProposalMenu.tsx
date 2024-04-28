/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, {
  useState,
  useCallback,
  useMemo,
} from 'react';
import { jsx, css } from '@emotion/react';
import {
  Button,
  FormGroup,
  ControlGroup,
  TextArea,
  PanelStack2 as PanelStack, type Panel,
  Menu, MenuItem,
  NonIdealState,
} from '@blueprintjs/core';


const NewProposalMenu: React.FC<{
  className?: string
  previousVersion: string | null
  onCreateBlank?: (idea: string) => Promise<void>
  onImport?: () => Promise<void>
}> = function ({ previousVersion, onCreateBlank, onImport, className }) {
  const [ createMode, setCreateMode ] = useState(false);
  const creatingBlank = onCreateBlank && createMode;

  const stack: Panel<any>[] = useMemo(() => {
    const stack = [];
    const createMenu = (
      <Menu css={css`overflow-y: auto; background: none !important;`}>
        <MenuItem 
          text="Start blank proposal"
          onClick={(onCreateBlank && !createMode)
            ? (() => setCreateMode(true))
            : undefined}
          disabled={!onCreateBlank}
          active={creatingBlank}
          selected={creatingBlank}
          icon="add"
        />
        <MenuItem
          text="Import proposal"
          onClick={onImport}
          disabled={!onImport || creatingBlank}
          icon="import"
        />
      </Menu>
    );

    stack.push({
      title: "Add new proposal",
      renderPanel: () => createMenu,
    });

    if (creatingBlank) {
      stack.push({
        title: "Start blank proposal",
        renderPanel: () =>
          <NewProposal
            previousVersion={previousVersion}
            onCreateBlank={onCreateBlank}
            css={css`padding: 5px;`}
          />,
      });
    }
    return stack;
  }, [onCreateBlank, onImport, creatingBlank, previousVersion]);

  return <PanelStack
    css={css`flex: 1; overflow: unset; .bp4-panel-stack-view { background: none; }`}
    className={className}
    onClose={() => setCreateMode(false)}
    stack={stack.length > 0
      ? stack
      : [{ title: '', renderPanel: () => <NonIdealState title="Nothing to show" /> }]}
  />;
};

export default NewProposalMenu;


const NewProposal: React.VoidFunctionComponent<{
  previousVersion: string | null
  onCreateBlank?: (idea: string) => Promise<void>
  className?: string
}> = function ({ previousVersion, onCreateBlank, className }) {
  const [ newProposalIdea, setNewProposalIdea ] = useState('');

  const handleNewProposal = useCallback(async function handleNewProposal () {
    if (newProposalIdea.trim()) {
      await onCreateBlank?.(newProposalIdea);
      setNewProposalIdea('');
    } else {
      throw new Error("Cannot create proposal: need some initial motivation for the change");
    }
  }, [newProposalIdea, onCreateBlank]);

  return (
    <FormGroup
        className={className}
        css={css`overflow-y: auto;`}
        label={<>
          Propose
          {previousVersion
            ? ` a change to version ${previousVersion}:`
            : ` the first change:`}
        </>}>
      <ControlGroup vertical>
        <TextArea
          value={newProposalIdea ?? ''}
          placeholder="Your idea…"
          title="Justification draft (you can change this later)"
          onChange={evt => setNewProposalIdea(evt.currentTarget.value)}
        />
        <Button
            fill
            intent={newProposalIdea ? 'primary': undefined}
            disabled={!newProposalIdea.trim() || !onCreateBlank}
            title="A blank proposal will be created and opened in a new tab."
            onClick={handleNewProposal}
            icon="tick">
          Create
        </Button>
      </ControlGroup>
    </FormGroup>
  );
};
