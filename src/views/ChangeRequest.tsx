/** @jsx jsx */
/** @jsxFrag React.Fragment */

import log from 'electron-log';

import yaml from 'js-yaml';
import update from 'immutability-helper';

import { jsx, css } from '@emotion/core';
import styled from '@emotion/styled';
import React, { useContext, useState } from 'react';

import {
  Button, ButtonGroup, Callout, Classes,
  Colors,
  FormGroup, H4, HTMLSelect, IconName, InputGroup, IOptionProps,
  ITreeNode, Menu, NonIdealState, Spinner, TextArea, Tree
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';

import {
  ChangeProposal, ChangeRequest, DECISION_STATUSES, DISPOSITION_OPTIONS,
  InternalItemReference,
  ItemClassConfiguration, ItemDetailView, ItemEditView, Payload, PROPOSAL_TYPES,
  RegisterItem,
  RegisterItemDataHook,
  RegistryViewProps, RelatedItemClassConfiguration
} from '../types';
import { RegisterStakeholder } from '../types';
import { MainView } from './MainView';
import { _getRelatedClass } from './util';
import { ItemDetailsWrapperDiv } from './ItemDetails';


const PROPOSAL_ICON: Record<typeof PROPOSAL_TYPES[number], IconName> = {
  addition: 'add',
  clarification: 'edit',
  amendment: 'remove',
}


export const CHANGE_REQUEST_OPTIONS: Record<string, IOptionProps> = {
  new: { value: 'new', label: "New change request…" },
} as const;


function getItemPath(itemID: string, proposal: ChangeProposal): string {
  const { classID, subregisterID } = proposal;
  let itemPath: string;
  if (subregisterID) {
    itemPath = `subregisters/${subregisterID}/${classID}/${itemID}`;
  } else {
    itemPath = `${classID}/${itemID}`;
  }
  return itemPath;
}


export const ChangeRequestView: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration' | 'subregisters'> & {
  id: string
  stakeholder?: RegisterStakeholder
  useRegisterItemData: RegisterItemDataHook
  onSave?: (crID: string, newValue: ChangeRequest, oldValue: ChangeRequest) => Promise<void>
  onDelete?: (crID: string, oldValue: ChangeRequest) => Promise<void>
}> = function ({
    itemClassConfiguration, id,
    subregisters,
    stakeholder,
    useRegisterItemData,
    onSave, onDelete }) {

  const { useObjectData, makeRandomID, changeObjects } = useContext(DatasetContext);

  const [selectedItem, selectItem] = useState<string>('justification');

  const objectPath = `change-requests/${id}.yaml`;
  const crData = useObjectData({ [objectPath]: 'utf-8' as const });
  const dataAsString = crData.value?.[objectPath]?.value || undefined;
  const maybeCR: ChangeRequest | undefined = dataAsString !== undefined
    ? yaml.load(dataAsString as string)
    : undefined;

  const itemDataRequest = maybeCR
    ? Object.entries(maybeCR.proposals).
        map(([itemID, proposal]) => ({ [getItemPath(itemID, proposal)]: 'utf-8' as const })).
        reduce((p, c) => ({ ...p, ...c }), {})
    : {};

  //log.debug("Item data request", itemDataRequest);
  //const itemData = useObjectData(itemDataRequest).value;

  const itemData: Record<string, RegisterItem<any>> = useRegisterItemData(itemDataRequest).value;

  const useRegisterItemDataMaybeFromCR: RegisterItemDataHook = function (paths) {
    const result = useRegisterItemData(paths);
    for (const path of Object.keys(paths)) {
      log.debug("Checking path from register item data", path, result.value[path]);
      const parts = path.split('/');
      const itemID = parts[parts.length - 1];
      log.debug("Getting register data from CR", path, itemID, maybeCR?.proposals[itemID]);
      if (maybeCR) {
        const proposal = maybeCR.proposals[itemID];
        if (proposal && (proposal.type === 'clarification' || proposal.type === 'addition')) {
          result.value[path] = { id: itemID, data: proposal.payload, status: 'proposed', dateAccepted: new Date() };
        }
      }
    }
    return result;
  }

  const [edited, updateEdited] = useState<ChangeRequest | null>(null);

  let el: JSX.Element;

  if (maybeCR === undefined) {
    el = <NonIdealState title={<Spinner />} />;

  } else if ((maybeCR as ChangeRequest).id) {
    const originalCR = maybeCR as ChangeRequest;
    const cr = edited ?? originalCR;

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

    async function handleAddProposal(classID: string, subregisterID?: string): Promise<InternalItemReference> {
      const classConfig = Object.values(itemClassConfiguration).find(cls => cls.meta.id === classID);

      if (!classConfig) {
        log.error("Unable to add proposal: item class configuration cannot be found", classID);
        throw new Error("Unable to add proposal");
      }

      if (!cr) {
        log.error("Unable to add proposal: CR is missing");
        throw new Error("Unable to add proposal: CR is missing");
      }

      const payload = classConfig.defaults ?? {};
      const id = await makeRandomID();

      const proposal: ChangeProposal = {
        type: 'addition',
        payload,
        classID,
        subregisterID,
      };

      console.debug("Adding proposal", id, proposal, JSON.stringify(cr.proposals));

      if ((cr.proposals ?? {})[id]) {
        log.error("Unable to add proposal: already exists!", id);
        throw new Error("Proposal with this ID already exist");
      }

      setTimeout(() => {
        updateEdited(_cr => ({ ...(_cr ?? cr), proposals: { ...(_cr ?? cr).proposals, [id]: proposal } }));
        selectItem(id);
      }, 200);

      return { itemID: id, classID, subregisterID };
    }

    async function handleAcceptProposal(itemID: string, proposal: ChangeProposal) {
      if (!changeObjects || !canReview || !onSave) {
        return;
      }

      const clsID = proposal.classID;
      const classConfig = Object.values(itemClassConfiguration).find(cls => cls.meta.id === clsID);
      if (!classConfig) {
        log.error("Cannot locate class config", clsID, proposal);
        return;
      }

      const itemPath = getItemPath(itemID, proposal);
      const existingItem = itemData[itemPath];

      const itemFilePath = `${itemPath}.yaml`;

      if (proposal.type === 'addition') {
        if (existingItem) {
          log.error("Cannot accept proposed addition: item already exists", clsID, itemID);
          throw new Error("Cannot accept proposed addition: item already exists");
        }
        const newItem: RegisterItem<any> = {
          id: itemID,
          status: 'valid',
          dateAccepted: new Date(),
          data: proposal.payload,
        };
        await changeObjects({
          [itemFilePath]: {
            newValue: yaml.dump(newItem, { noRefs: true }),
            oldValue: null,
            encoding: 'utf-8' as const,
          },
        }, `CR: Accepted addition of ${clsID}/${itemID} (per CR ${id})`);

      } else if (proposal.type === 'clarification') {
        if (!existingItem) {
          log.error("Cannot accept proposed clarification: item does not exist", clsID, itemID);
          throw new Error("Cannot accept proposed clarification: item does not exist");
        }
        const clarifiedItem: RegisterItem<any> = {
          ...existingItem,
          data: proposal.payload,
        };
        await changeObjects({
          [itemFilePath]: {
            newValue: yaml.dump(clarifiedItem, { noRefs: true }),
            oldValue: yaml.dump(existingItem, { noRefs: true }),
            encoding: 'utf-8' as const,
          },
        }, `CR: Accepted clarification of ${clsID}/${itemID} (per CR ${id})`, true);

      } else if (proposal.type === 'amendment') {
        if (!existingItem) {
          log.error("Cannot accept proposed amendment: item does not exist", clsID, itemID);
          throw new Error("Cannot accept proposed amendment: item does not exist");
        }
        if (existingItem.status !== 'valid') {
          log.error("Cannot accept proposed amendment: item is not valid", clsID, itemID);
          throw new Error("Cannot accept proposed amendment: item is not valid");
        }
        const amendedItem = {
          ...existingItem,
          status: proposal.amendmentType === 'supersession' && classConfig?.itemCanBeSuperseded
            ? 'superseded'
            : 'retired',
        };
        if (proposal.amendmentType === 'supersession') {
          if (classConfig.itemCanBeSuperseded === true) {
            if (proposal.supersedingItemID) {
              const supersedingItemPath = getItemPath(proposal.supersedingItemID, proposal);
              if (cr.proposals[proposal.supersedingItemID]?.type !== 'addition' && !itemData[supersedingItemPath]) {
                log.error("Cannot accept proposed amendment: superseding item does not exist and was not added in this change request", clsID, itemID);
                throw new Error("Cannot accept proposed amendment: superseding item does not exist and was not added in this change request");
              }
            } else {
              log.error("Cannot accept proposed amendment: superseding item is not specified", clsID, itemID);
              throw new Error("Cannot accept proposed amendment: superseding item is not specified");
            }
          } else {
            log.error("Cannot accept proposed amendment: item class does not allow supersession", clsID, itemID);
            throw new Error("Cannot accept proposed amendment: item class does not allow supersession");
          }
        }
        await changeObjects({
          [itemFilePath]: {
            newValue: yaml.dump(amendedItem, { noRefs: true }),
            oldValue: yaml.dump(existingItem, { noRefs: true }),
            encoding: 'utf-8' as const,
          },
        }, `CR: Accepted amendment of ${clsID}/${itemID} (per CR ${id})`, true);
      }

      const updatedProposal: ChangeProposal = { ...proposal, accepted: true };
      await onSave(originalCR.id, { ...originalCR, proposals: { ...originalCR.proposals, [itemID]: updatedProposal } }, originalCR);
    }

    const isMyCR = cr.sponsor.gitServerUsername === stakeholder?.gitServerUsername;

    const canDelete = onDelete && cr.timeProposed === undefined && isMyCR;
    const canPropose = onSave && (cr.timeProposed === undefined || cr.disposition === 'withdrawn') && isMyCR;
    const canEdit = onSave && cr.timeProposed === undefined && isMyCR;
    const canWithdraw = onSave && cr.timeProposed !== undefined && cr.timeDisposed === undefined && isMyCR && cr.disposition !== 'withdrawn';
    const canReview = onSave && cr.timeProposed !== undefined && (stakeholder?.role === 'manager' || stakeholder?.role === 'owner');
    const canDispose = onSave && cr.timeProposed !== undefined && cr.timeDisposed === undefined && (stakeholder?.role === 'manager' || stakeholder?.role === 'owner');

    const tentativelyAccepted = cr.status === 'tentative' && cr.disposition === 'accepted';
    const tentativelyNotAccepted = cr.status === 'tentative' && cr.disposition === 'notAccepted';

    const actions = (canPropose || canWithdraw || canDispose || canDelete)
      ? <ButtonGroup>
          {(canEdit || canReview) ? <Button disabled={edited === null} onClick={handleSave}>Save</Button> : null}

          {canDelete
            ? <Button intent="danger" disabled={edited !== null} onClick={onDelete
                ? () => onDelete(originalCR.id, originalCR)
                : void 0}>Delete</Button>
            : null}

          {canPropose
            ? <Button disabled={edited !== null} intent="success"
                onClick={handlePropose}>Propose</Button>
            : null}

          {canWithdraw
            ? <Button disabled={edited !== null} intent="warning"
                onClick={() => handleUpdateState('pending', 'withdrawn')}>Withdraw</Button>
            : null}

          {canDispose
            ? <React.Fragment>
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
            : null}
        </ButtonGroup>
      : <React.Fragment>
          Status:&nbsp;<em>{cr.status ?? 'N/A'}</em>
          &emsp;•&emsp;
          Disposition:&nbsp;<em>{cr.disposition ?? 'N/A'}</em>
        </React.Fragment>;

    let detailView: JSX.Element;
    if (selectedItem === 'justification') {
      detailView = <CRMetaInput>
        <CRJustification
          value={cr.justification}
          onChange={changeObjects
            ? (justification) => updateEdited({ ...cr, justification })
            : undefined}
        />
      </CRMetaInput>;
    } else if (selectedItem === 'control-body') {
      detailView = <CRMetaInput>
        <CRControlBodyInput
          value={{ notes: cr.controlBodyNotes, event: cr.controlBodyDecisionEvent }}
          onChange={changeObjects
            ? (controlBodyNotes, controlBodyDecisionEvent) =>
              updateEdited({ ...cr, controlBodyNotes, controlBodyDecisionEvent })
            : undefined}
        />
      </CRMetaInput>;
    } else if (selectedItem === 'manager') {
      detailView = <CRMetaInput>
        <CRManagerNotes
          value={cr.registerManagerNotes}
          onChange={changeObjects
            ? (registerManagerNotes) => updateEdited({ ...cr, registerManagerNotes })
            : undefined}
        />
      </CRMetaInput>;
    } else if (selectedItem === 'proposals') {
      detailView = <NonIdealState
        description={
          changeObjects
          ? <>
              <Callout style={{ textAlign: 'left', marginBottom: '1rem' }} title="Managing your proposals" intent="primary">
                <p>
                  Select a proposed change on the left to&nbsp;view or&nbsp;edit&nbsp;it.
                </p>
                <p>
                  To propose a change to an existing item, exit this CR, navigate to an item you want to change in item list, and&nbsp;click “Propose&nbsp;a&nbsp;change”.
                </p>
                <p>
                  You won’t be able to edit your change request once you have submitted it.
                </p>
              </Callout>
              <Menu className={Classes.ELEVATION_1} style={{ marginBottom: '1rem' }}>
                <Menu.Item
                  icon="add"
                  text="Propose a new item"
                  children={subregisters !== undefined
                    ? Object.entries(subregisters).map(([subregisterID, subregisterCfg]) =>
                        <Menu.Item
                          key={subregisterID}
                          label="subregister"
                          text={subregisterCfg.title}
                          children={Object.entries(itemClassConfiguration).
                              filter(([classID]) => subregisterCfg.itemClasses.indexOf(classID) >= 0).
                              map(([classID, classCfg]) =>
                            <Menu.Item
                              key={classID}
                              label="item class"
                              text={classCfg.meta.title}
                              onClick={async () => handleAddProposal(classID, subregisterID)}
                            />
                          )}
                        />
                      )
                    : Object.entries(itemClassConfiguration).map(([classID, classCfg]) =>
                        <Menu.Item
                          key={classID}
                          label="item class"
                          text={classCfg.meta.title}
                          onClick={async () => handleAddProposal(classID)}
                        />
                      )
                  }
                />
              </Menu>
            </>
          : <Callout style={{ textAlign: 'left' }} title="Reviewing proposed changes" intent="primary">
              Select a proposed change on the left to view.
            </Callout>
        }
      />;
    } else if (cr.proposals[selectedItem]) {
      const proposal = cr.proposals[selectedItem];
      const itemID = selectedItem;
      const classConfig = Object.values(itemClassConfiguration).find(cls => cls.meta.id === proposal.classID);
      const itemPath = getItemPath(selectedItem, proposal);
      const existingItemData = itemData[itemPath]?.data;
      const getRelatedClass = _getRelatedClass(itemClassConfiguration);

      if (classConfig && (existingItemData || proposal.type === 'addition')) {
        try {
          detailView = <ProposalDetails
            value={proposal}
            classConfig={classConfig}
            existingItemData={existingItemData ?? undefined}
            getRelatedClass={getRelatedClass}
            useRegisterItemData={useRegisterItemDataMaybeFromCR}
            subregisters={subregisters}
            onAddRelated={canEdit
              ? handleAddProposal
              : undefined}
            onAccept={canReview && canDispose
              ? () => handleAcceptProposal(itemID, proposal)
              : undefined}
            ItemView={classConfig.views.editView}
            onChange={canEdit
              ? (proposal) => {
                  //log.debug("Editing", selectedItem, proposal, existingItemData);
                  updateEdited(update(cr, { proposals: { [selectedItem]: { $set: proposal } } }));
                  //updateEdited(_cr => ({ ...(_cr ?? cr), proposals: { ...(_cr ?? cr).proposals, [id]: proposal } }));
                }
              : undefined}
            onDelete={canEdit
              ? () => { updateEdited(update(cr, { proposals: { $unset: [selectedItem] } })); selectItem('justification') }
              : undefined}
          />;
        } catch (e) {
          detailView = <NonIdealState
            icon="heart-broken"
            title="Unable to load existing item data" />;
        }
      } else {
        detailView = <NonIdealState
          icon="heart-broken"
          title="Unknown item class or missing item data!" />;
      }
    } else {
      detailView = <NonIdealState
        icon="heart-broken"
        title="A strange thing happened"
        description={`Unable to find selected item “${selectedItem}”`} />;
    }

    el = (
      <MainView actions={actions}>
        <div css={css`flex-shrink: 0; width: 300px; display: flex; flex-flow: column nowrap; background: ${Colors.WHITE}`}>
          <CRNavigation
            itemClassConfiguration={itemClassConfiguration}
            subregisters={subregisters}
            proposals={cr.proposals}
            itemData={itemData}
            onSelect={selectItem}
            useRegisterItemData={useRegisterItemData}
            selectedItem={selectedItem}
            enableControlBodyInput={changeObjects !== undefined || cr.controlBodyDecisionEvent !== undefined || cr.controlBodyNotes !== undefined}
            enableManagerNotes={changeObjects !== undefined || cr.registerManagerNotes !== undefined}
          />
        </div>

        <div css={css`flex: 1; overflow: hidden; display: flex; flex-flow: column nowrap;`} className={Classes.ELEVATION_1}>
          {detailView}
        </div>
      </MainView>
    );

  } else {
    el = <NonIdealState icon="heart-broken" title="Failed to load selected change request" />;
  }

  return el;
};


const CRNavigation: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration' | 'subregisters'> & {
  useRegisterItemData: RegisterItemDataHook
  proposals: ChangeRequest["proposals"]
  enableControlBodyInput: boolean
  enableManagerNotes: boolean
  itemData: Record<string, RegisterItem<any>>,
  selectedItem: string
  onSelect: (item: string) => void
}> =
function ({
    itemData, proposals, itemClassConfiguration, subregisters,
    useRegisterItemData,
    onSelect,
    selectedItem, enableControlBodyInput, enableManagerNotes }) {

  function handleSelect(node: ITreeNode) {
    onSelect(node.id as string);
  }

  const getRelatedClass = _getRelatedClass(itemClassConfiguration);

  const nodes: ITreeNode[] = [{
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
  }, {
    id: 'proposals',
    label: "Proposals",
    isExpanded: true,
    isSelected: selectedItem === 'proposals',
    hasCaret: Object.keys(proposals).length > 0,
    childNodes: [ ...Object.entries(proposals).map(([itemID, proposal]) => {
      const { classID } = proposal;
      const clsConfig = Object.values(itemClassConfiguration).find(cls => cls.meta.id === classID);
      //const subregConfig = subregisters && proposal.subregisterID
      //  ? subregisters[proposal.subregisterID]
      //  : undefined;
      const View = clsConfig?.views.listItemView;
      const itemPath = getItemPath(itemID, proposal);
      const data = itemData[itemPath]?.data ?? undefined;

      let label: JSX.Element;

      if (!View) {
        label = <span>{itemID}</span>;
      } else if (proposal.type === 'addition') {
        label = <View
          itemID={itemID}
          subregisterID={proposal.subregisterID}
          useRegisterItemData={useRegisterItemData}
          css={css`white-space: nowrap;`}
          getRelatedItemClassConfiguration={getRelatedClass}
          itemData={proposal.payload} />;
      } else if (data !== undefined) {
        label = <View
          itemID={itemID}
          subregisterID={proposal.subregisterID}
          useRegisterItemData={useRegisterItemData}
          css={css`white-space: nowrap;`}
          getRelatedItemClassConfiguration={getRelatedClass}
          itemData={data} />;
      } else {
        label = <span>Unable to read item</span>;
      }

      return {
        isSelected: selectedItem === itemID,
        id: itemID,
        icon: PROPOSAL_ICON[proposal.type] as IconName,
        //secondaryLabel: <Tag
        //    minimal css={css`white-space: nowrap;`}>
        //  {subregConfig
        //    ? `${subregConfig.title} / `
        //    : null}
        //  {clsConfig?.meta.title ?? '<unknown class>'}
        //</Tag>,
        label,
      };
    })],
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
        disabled={!onChange} value={value ?? ''}
        onChange={(evt) => onChange ? onChange(evt.currentTarget.value || undefined) : void 0} />
    </FormGroup>
  );
};


const ProposalDetails: React.FC<
  Pick<RegistryViewProps, 'subregisters'> & {
  value: ChangeProposal
  classConfig: ItemClassConfiguration<any>

  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration
  useRegisterItemData: RegisterItemDataHook

  existingItemData?: Payload
  ItemView: ItemEditView<any> | ItemDetailView<any>

  onAccept?: () => Promise<void>
  onChange?: (val: ChangeProposal) => void
  onDelete?: () => void
  onAddRelated?: (classID: string, subregisterID?: string) => Promise<InternalItemReference>
}> = function ({
    value,
    onChange, onDelete, onAccept, onAddRelated,
    ItemView,
    existingItemData, classConfig, getRelatedClass,
    useRegisterItemData, subregisters }) {
  let itemView: JSX.Element;
  let proposalProperties: JSX.Element | null;

  const [isBusy, setBusy] = useState(false);

  if (value.type === 'amendment') {
    proposalProperties = (
      <FormGroup
          label="Supersede with:"
          helperText={classConfig.itemCanBeSuperseded !== true
            ? "Items of this class cannot be superseded, only retired."
            : "Please enter the full UUID of the superseding item, or leave empty to retire this item without a successor."}>
        <InputGroup
          value={value.amendmentType === 'supersession' && classConfig.itemCanBeSuperseded === true
            ? value.supersedingItemID
            : ''}
          disabled={!onChange || classConfig.itemCanBeSuperseded !== true}
          placeholder="Successor item ID"
          onChange={onChange
            ? (evt: React.FormEvent<HTMLInputElement>) => {
                if (!onChange) { return; }
                const itemID = evt.currentTarget.value;
                if (itemID.trim() === '' || classConfig.itemCanBeSuperseded !== true) {
                  const newVal = update(value, { $unset: ['supersedingItemID'] });
                  onChange({ ...newVal, amendmentType: 'retirement' });
                } else {
                  onChange({ ...value, amendmentType: 'supersession', supersedingItemID: itemID });
                }
              }
            : undefined}/>
      </FormGroup>
    );
  } else {
    proposalProperties = null;
  }

  const itemData: Payload | undefined = (value.type === 'addition' || value.type === 'clarification')
    ? value.payload
    : existingItemData;

  if (itemData === undefined || ItemView === undefined) {
    itemView = <NonIdealState icon="heart-broken" title="Unable to display this item" />;

  } else if (onChange && value.type !== 'amendment') {
    const View = ItemView as ItemEditView<any>;

    itemView = <View
      itemData={itemData}
      subregisterID={value.subregisterID}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedClass}
      onCreateRelatedItem={onAddRelated}
      onChange={onChange
        ? (payload) => onChange ? onChange({ ...value, payload }) : void 0
        : undefined} />;

  } else {
    const View = ItemView as ItemDetailView<any>;
    itemView = <View
      subregisterID={value.subregisterID}
      useRegisterItemData={useRegisterItemData}
      getRelatedItemClassConfiguration={getRelatedClass}
      itemData={itemData} />;
  }

  const canChangeProposalType = value.type !== 'addition';

  function handleTypeChange(type: string) {
    const pt = type as typeof PROPOSAL_TYPES[number];

    if (PROPOSAL_TYPES.indexOf(pt) < 0) { return; }
    if (!onChange || !canChangeProposalType || pt === 'addition' || existingItemData === undefined) { return; }

    if (pt === 'amendment') {
      onChange(update(value, {
        type: { $set: pt },
        amendmentType: { $set: 'retirement' },
        $unset: ['payload'],
      }));
    } else {
      onChange(update(value, {
        type: { $set: pt },
        payload: existingItemData,
      }));
    }
  }

  function handleAction(func: () => Promise<void>) {
    return async () => {
      try {
        setBusy(true);
        await func();
      } finally {
        setBusy(false);
      }
    }
  }

  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; padding: 1rem; overflow: hidden;`}>
      <div css={css`flex-shrink: 0; display: flex; flex-flow: row nowrap; align-items: center; margin-bottom: 1rem;`}>
        <HTMLSelect
          options={PROPOSAL_TYPES.map(pt => ({ value: pt, label: pt }))}
          iconProps={{ icon: PROPOSAL_ICON[value.type] }}
          value={value.type}
          disabled={!onChange || !canChangeProposalType || existingItemData === undefined}
          onChange={(onChange && canChangeProposalType && existingItemData !== undefined)
            ? (evt) => handleTypeChange(evt.currentTarget.value)
            : undefined} />
        &ensp;
        of a
        &ensp;
        <H4 css={css`margin: 0;`}>{classConfig.meta.title}</H4>
        {value.subregisterID !== undefined && subregisters !== undefined
          ? <>
              &ensp;in {subregisters[value.subregisterID]?.title ?? value.subregisterID}
            </>
          : null}
      </div>

      {proposalProperties}

      <ItemDetailsWrapperDiv className={Classes.ELEVATION_3}>
        {itemView}
      </ItemDetailsWrapperDiv>

      {value.accepted
        ? <div css={css`flex-shrink: 0; margin-top: 1rem;`}>
            <FormGroup css={css`margin-bottom: 0`}>
              <Button disabled intent="success">Accepted</Button>
            </FormGroup>
          </div>
        : null}

      {onDelete
        ? <div css={css`flex-shrink: 0; margin-top: 1rem;`}>
            <FormGroup css={css`margin-bottom: 0`}>
              <Button loading={isBusy} onClick={onDelete} intent="danger">Delete this proposal from current change request</Button>
            </FormGroup>
          </div>
        : null}

      {onAccept && !value.accepted
        ? <div css={css`flex-shrink: 0; margin-top: 1rem;`}>
            <FormGroup css={css`margin-bottom: 0`}>
              <Button loading={isBusy} onClick={handleAction(onAccept)} intent="success">Accept this proposal into the register</Button>
            </FormGroup>
          </div>
        : null}
    </div>
  );
};


const CRMetaInput = styled.div`
  padding: 1rem;
`;
