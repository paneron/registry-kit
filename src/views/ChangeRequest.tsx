/** @jsx jsx */
/** @jsxFrag React.Fragment */

import yaml from 'js-yaml';

import React, { useContext, useState } from 'react';

import { jsx, css } from '@emotion/react';
import styled from '@emotion/styled';

import {
  Button, ButtonGroup,
  FormGroup, OptionProps,
  NonIdealState, Spinner, TextArea,
  TreeNodeInfo, Tree,
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import Workspace from '@riboseinc/paneron-extension-kit/widgets/Workspace';

import {
  ChangeRequest, DECISION_STATUSES, DISPOSITION_OPTIONS,
} from '../types';
import { _getRelatedClass } from './util';


export const CHANGE_REQUEST_OPTIONS: Record<string, OptionProps> = {
  new: { value: 'new', label: "New change request…" },
} as const;


export const ChangeRequestView: React.FC<{
  id: string
  onSave?: (crID: string, newValue: ChangeRequest, oldValue: ChangeRequest) => Promise<void>
  onDelete?: (crID: string, oldValue: ChangeRequest) => Promise<void>
}> = function ({ id, onSave, onDelete }) {

  const { useObjectData, updateObjects } = useContext(DatasetContext);

  const [selectedItem, selectItem] = useState<string>('justification');

  const objectPath = `change-requests/${id}.yaml`;
  const crData = useObjectData({ objectPaths: [objectPath] });
  const dataAsString = crData.value.data?.[objectPath]?.value ?? undefined;
  const maybeCR: ChangeRequest | Record<never, never> | undefined =
    dataAsString !== undefined
      ? yaml.load(dataAsString as string)
      : undefined;

  //log.debug("Item data request", itemDataRequest);
  //const itemData = useObjectData(itemDataRequest).value;

  const [edited, updateEdited] = useState<ChangeRequest | null>(null);

  let el: JSX.Element;

  if (maybeCR === undefined) {
    el = <NonIdealState title={<Spinner />} />;

  } else if ((maybeCR as ChangeRequest).id) {
    const originalCR = maybeCR as ChangeRequest;
    const cr = edited || originalCR;

    async function handleSave() {
      if (!onSave) { return; }
      if (edited === null) { return; }
      await onSave(originalCR.id, edited, originalCR);
      updateEdited(null);
    }

    function handlePropose() {
      if (!onSave) { return; }
      if (edited !== null) { return; }
      onSave(originalCR.id, { ...cr, status: 'pending', disposition: undefined, timeProposed: new Date() }, originalCR);
    }

    function handleUpdateState(
        newStatus: typeof DECISION_STATUSES[number],
        newDisposition: typeof DISPOSITION_OPTIONS[number] | undefined) {
      if (!onSave) { return; }
      if (edited !== null) { return; }
      let extraProps: Partial<ChangeRequest>;

      if (newStatus === 'final') {
        extraProps = { timeDisposed: new Date() };
      } else {
        if (newDisposition === 'withdrawn') {
          extraProps = { timeProposed: undefined };
        } else {
          extraProps = {};
        }
      }
      onSave(originalCR.id, { ...cr, status: newStatus, disposition: newDisposition, ...extraProps }, originalCR);
    }

    // async function handleAddProposal(id: string, defaults: Record<string, any>) {
    //   updateEdited(update(cr, { proposals: {
    //     [id]: { $set: { type: 'addition', payload: defaults } },
    //   } }))
    // }

    // async function handleAcceptProposal(itemID: string, clsID: string, proposal: ChangeProposal) {
    //   if (!updateObjects) {
    //     return;
    //   }

    //   const itemPath = `${clsID}/${itemID}`;
    //   const itemFilePath = `${itemPath}.yaml`;

    //   const existingItem = itemData[itemPath];

    //   if (proposal.type === 'addition') {
    //     if (existingItem) {
    //       log.error("Cannot accept proposed addition: item already exists", clsID, itemID);
    //       throw new Error("Cannot accept proposed addition: item already exists");
    //     }
    //     const newItem: RegisterItem<any> = {
    //       id: itemID,
    //       status: 'valid',
    //       dateAccepted: new Date(),
    //       data: proposal.payload,
    //     };
    //     await updateObjects({
    //       commitMessage: `CR: Accepted addition of ${clsID}/${itemID} (per CR ${id})`,
    //       objectChangeset: {
    //         [itemFilePath]: {
    //           newValue: newItem,
    //           oldValue: null,
    //         },
    //       },
    //     }, );

    //   } else if (proposal.type === 'clarification') {
    //     if (!existingItem) {
    //       log.error("Cannot accept proposed clarification: item does not exist", clsID, itemID);
    //       throw new Error("Cannot accept proposed clarification: item does not exist");
    //     }
    //     const clarifiedItem: RegisterItem<any> = {
    //       ...existingItem,
    //       data: proposal.payload,
    //     };
    //     await updateObjects({
    //       commitMessage: `CR: Accepted clarification of ${clsID}/${itemID} (per CR ${id})`,
    //       objectChangeset: {
    //         [itemPath]: {
    //           newValue: clarifiedItem,
    //           oldValue: existingItem,
    //         },
    //       },
    //     }, );

    //   } else if (proposal.type === 'amendment') {
    //     if (!existingItem) {
    //       log.error("Cannot accept proposed amendment: item does not exist", clsID, itemID);
    //       throw new Error("Cannot accept proposed amendment: item does not exist");
    //     }
    //     if (existingItem.status !== 'valid') {
    //       log.error("Cannot accept proposed amendment: item is not valid", clsID, itemID);
    //       throw new Error("Cannot accept proposed amendment: item is not valid");
    //     }
    //     const amendedItem = {
    //       ...existingItem,
    //       status: proposal.amendmentType === 'retirement' ? 'retired' : 'superseded',
    //     };
    //     if (proposal.amendmentType === 'supersession') {
    //       if (cr.proposals[`${clsID}/${proposal.supersedingItemID}`]?.type !== 'addition') {
    //         log.error("Cannot accept proposed amendment: superseding item is not specified or cannot be found", clsID, itemID);
    //         throw new Error("Cannot accept proposed amendment: superseding item is not specified or cannot be found");
    //       }
    //     }
    //     await updateObjects({
    //       commitMessage: `CR: Accepted amendment of ${clsID}/${itemID} (per CR ${id})`,
    //       objectChangeset: {
    //         [itemPath]: {
    //           newValue: amendedItem,
    //           oldValue: existingItem,
    //         },
    //       },
    //     }, );
    //   }
    // }

    const tentativelyAccepted = cr.status === 'tentative' && cr.disposition === 'accepted';
    const tentativelyNotAccepted = cr.status === 'tentative' && cr.disposition === 'notAccepted';

    const actions = updateObjects !== undefined
      ? <ButtonGroup>
          <Button disabled={edited === null} onClick={handleSave}>Save</Button>

          <Button intent="danger" disabled={edited !== null} onClick={onDelete
            ? () => onDelete(originalCR.id, originalCR)
            : void 0}>Delete</Button>

            <Button disabled={edited !== null} intent="success"
              onClick={handlePropose}>Propose</Button>

            <Button disabled={edited !== null} intent="warning"
              onClick={() => handleUpdateState('pending', 'withdrawn')}>Withdraw</Button>

            <React.Fragment>
              {!tentativelyNotAccepted
                ? <Button
                      disabled={edited !== null}
                      active={cr.disposition === 'accepted'}
                      onClick={() => handleUpdateState('tentative', 'accepted')}>
                    Accept
                  </Button>
                : null}
              {tentativelyAccepted
                ? <Button
                      disabled={edited !== null}
                      active={cr.status === 'final'} icon="take-action"
                      onClick={() => handleUpdateState('final', 'accepted')}>
                    Final
                  </Button>
                : null}
              {!tentativelyAccepted
                ? <Button
                      disabled={edited !== null}
                      active={cr.disposition === 'notAccepted'}
                      onClick={() => handleUpdateState('tentative', 'notAccepted')}>
                    Do not accept
                  </Button>
                : null}
              {tentativelyNotAccepted
                ? <Button
                      disabled={edited !== null}
                      active={cr.status === 'final'} icon="take-action"
                      onClick={() => handleUpdateState('final', 'notAccepted')}>
                    Final
                  </Button>
                : null}
            </React.Fragment>
        </ButtonGroup>
      : <React.Fragment>
          Status: <em>{cr.status || '—'}</em>
          &emsp;•&emsp;
          Disposition: <em>{cr.disposition || '—'}</em>
        </React.Fragment>;

    let detailView: JSX.Element;
    if (selectedItem === 'justification') {
      detailView = <CRJustification
        value={cr.justification}
        onChange={updateObjects
          ? (justification) => updateEdited({ ...cr, justification })
          : undefined}
      />;
    } else if (selectedItem === 'control-body') {
      detailView = <CRControlBodyInput
        value={{ notes: cr.controlBodyNotes, event: cr.controlBodyDecisionEvent }}
        onChange={updateObjects
          ? (controlBodyNotes, controlBodyDecisionEvent) =>
            updateEdited({ ...cr, controlBodyNotes, controlBodyDecisionEvent })
          : undefined}
      />;
    } else if (selectedItem === 'manager') {
      detailView = <CRManagerNotes
        value={cr.registerManagerNotes}
        onChange={updateObjects
          ? (registerManagerNotes) => updateEdited({ ...cr, registerManagerNotes })
          : undefined}
      />;
    } else {
      detailView = <NonIdealState
        icon="heart-broken"
        title="A strange thing happened"
        description={`Unable to find selected item “${selectedItem}”`} />;
    }

    el = (
      <Workspace
          css={css`flex: 1 1 auto;`}
          toolbar={actions}>
        <WrapperDiv css={css`flex: 1;`}>
          {detailView}
          <div css={css`display: flex; flex-flow: row nowrap;`}>
            <CRNavigation
              onSelect={selectItem}
              selectedItem={selectedItem}
              enableControlBodyInput={
                updateObjects !== undefined ||
                cr.controlBodyDecisionEvent !== undefined ||
                cr.controlBodyNotes !== undefined}
              enableManagerNotes={
                updateObjects !== undefined ||
                cr.registerManagerNotes !== undefined}
            />
            <div css={css`flex: 1 1 auto`}>
              {detailView}
            </div>
          </div>
        </WrapperDiv>
      </Workspace>
    );

  } else {
    el = <NonIdealState icon="heart-broken" title="Failed to load selected change request" />;
  }

  return el;
};


export const WrapperDiv = styled.div`
  overflow-y: auto;
  position: relative;
`;


const CRNavigation: React.FC<{
  enableControlBodyInput: boolean
  enableManagerNotes: boolean
  selectedItem: string
  onSelect: (item: string) => void
}> =
function ({
  onSelect,
  selectedItem,
  enableControlBodyInput,
  enableManagerNotes,
}) {

  function handleSelect(node: TreeNodeInfo) {
    onSelect(node.id as string);
  }

  const nodes: TreeNodeInfo[] = [{
    id: 'justification',
    label: "Justification",
    isSelected: selectedItem === 'justification',
  }, {
    id: 'control-body',
    disabled: !enableControlBodyInput,
    label: "Control body input",
    isSelected: selectedItem === 'control-body',
  }, {
    id: 'manager',
    disabled: !enableManagerNotes,
    label: "Manager notes",
    isSelected: selectedItem === 'manager',
  }];

  return (
    <Tree
      contents={nodes}
      onNodeClick={handleSelect}
    />
  );
};


const CRJustification: React.FC<{
  value: string
  onChange?: (val: string) => void
}> = function ({ value, onChange }) {
  return (
    <FormGroup label="Justification:">
      <TextArea fill
        disabled={!onChange} value={value}
        onChange={(evt) => onChange ? onChange(evt.currentTarget.value) : void 0} />
    </FormGroup>
  );
};


const CRControlBodyInput: React.FC<{
  value: { notes: string | undefined, event: string | undefined }
  onChange?: (notes: string | undefined, event: string | undefined) => void
}> = function ({ value, onChange }) {
  function handleNotesChange(evt: React.FormEvent<HTMLTextAreaElement>) {
    onChange ? onChange(evt.currentTarget.value || undefined, value.event) : void 0;
  }
  function handleEventChange(evt: React.FormEvent<HTMLTextAreaElement>) {
    onChange ? onChange(value.notes, evt.currentTarget.value || undefined) : void 0;
  }
  return (
    <>
      <FormGroup label="Control body notes">
        <TextArea fill
          disabled={!onChange} value={value.notes || ''}
          onChange={handleNotesChange} />
      </FormGroup>
      <FormGroup label="Control body decision event">
        <TextArea fill
          disabled={!onChange} value={value.event || ''}
          onChange={handleEventChange} />
      </FormGroup>
    </>
  );
};


const CRManagerNotes: React.FC<{
  value: string | undefined
  onChange?: (val: string | undefined) => void
}> = function ({ value, onChange }) {
  return (
    <FormGroup label="Manager notes:">
      <TextArea fill
        disabled={!onChange} value={value || ''}
        onChange={(evt) => onChange ? onChange(evt.currentTarget.value || undefined) : void 0} />
    </FormGroup>
  );
};


// const ProposalDetails: React.FC<{
//   value: ChangeProposal
//   classConfig: ItemClassConfiguration<any>
// 
//   getRelatedClass: (clsID: string) => RelatedItemClassConfiguration
//   useRegisterItemData: RegisterItemDataHook
// 
//   existingItemData?: Payload
//   ItemView?: ItemEditView<any> | ItemDetailView<any>
// 
//   onAccept?: (itemID: string, clsID: string) => void
//   onChange?: (val: ChangeProposal) => void
//   onDelete?: () => void
// }> = function ({
//     value, onChange, ItemView,
//     existingItemData, classConfig, getRelatedClass,
//     useRegisterItemData }) {
//   let itemView: JSX.Element;
//   let proposalProperties: JSX.Element | null;
// 
//   if (value.type === 'amendment') {
//     proposalProperties = (
//       <FormGroup inline label="Supersede with:">
//         <InputGroup
//           value={value.amendmentType === 'supersession' ? value.supersedingItemID : ''}
//           disabled={!onChange}
//           placeholder="Item ID"
//           onChange={onChange
//             ? (evt: React.FormEvent<HTMLInputElement>) => {
//                 if (!onChange) { return; }
//                 const itemID = evt.currentTarget.value;
//                 if (itemID.trim() === '') {
//                   const newVal = update(value, { $unset: ['supersedingItemID'] });
//                   onChange({ ...newVal, amendmentType: 'retirement' });
//                 } else {
//                   onChange({ ...value, amendmentType: 'supersession', supersedingItemID: itemID });
//                 }
//               }
//             : undefined}/>
//       </FormGroup>
//     );
//   } else {
//     proposalProperties = null;
//   }
// 
//   const itemData: Payload | undefined = value.type === 'addition' ? value.payload : existingItemData;
// 
//   if (itemData === undefined) {
//     itemView = <NonIdealState icon="heart-broken" title="Unable to display this item" />;
//   } else if (onChange && value.type !== 'amendment') {
//     const View = ItemView as ItemEditView<any>;
//     itemView = <View
//       itemData={itemData}
//       getRelatedItemClassConfiguration={getRelatedClass}
//       useRegisterItemData={useRegisterItemData}
//       onChange={onChange
//         ? (payload) => onChange ? onChange({ ...value, payload }) : void 0
//         : undefined} />;
//   } else {
//     const View = ItemView as ItemDetailView<any>;
//     itemView = <View
//       useRegisterItemData={useRegisterItemData}
//       getRelatedItemClassConfiguration={getRelatedClass}
//       itemData={itemData} />;
//   }
// 
//   const canChangeProposalType = value.type !== 'addition';
// 
//   function handleTypeChange(type: string) {
//     const pt = type as typeof PROPOSAL_TYPES[number];
// 
//     if (PROPOSAL_TYPES.indexOf(pt) < 0) { return; }
//     if (!onChange || !canChangeProposalType || pt === 'addition' || existingItemData === undefined) { return; }
// 
//     if (pt === 'amendment') {
//       onChange(update(value, {
//         type: { $set: pt },
//         amendmentType: { $set: 'retirement' },
//         $unset: ['payload'],
//       }));
//     } else {
//       onChange(update(value, {
//         type: { $set: pt },
//         payload: existingItemData,
//       }));
//     }
//   }
// 
//   return (
//     <div css={css`flex: 1; display: flex; flex-flow: column nowrap;`}>
//       <div css={css`flex-shrink: 0; display: flex; flex-flow: row nowrap; align-items: center; margin-bottom: 1rem;`}>
//         <HTMLSelect
//           options={PROPOSAL_TYPES.map(pt => ({ value: pt, label: pt }))}
//           iconProps={{ icon: PROPOSAL_ICON[value.type] }}
//           value={value.type}
//           disabled={!onChange || !canChangeProposalType || existingItemData === undefined}
//           onChange={(onChange && canChangeProposalType && existingItemData !== undefined)
//             ? (evt) => handleTypeChange(evt.currentTarget.value)
//             : undefined} />
//         &ensp;
//         of a
//         &ensp;
//         <H4 css={css`margin: 0;`}>{classConfig.meta.title}</H4>
//         {proposalProperties}
//       </div>
// 
//       <div css={css`flex: 1; overflow-y: auto;`}>
//         {itemView}
//       </div>
//     </div>
//   );
// };
