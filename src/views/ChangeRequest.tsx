/** @jsx jsx */
/** @jsxFrag React.Fragment */

import log from 'electron-log';

import yaml from 'js-yaml';
import update from 'immutability-helper';

import React, { useContext, useState } from 'react';

import { jsx, css } from '@emotion/core';

import {
  Button, ButtonGroup, Callout, Classes,
  Colors,
  FormGroup, H4, HTMLSelect, IconName, InputGroup, IOptionProps,
  ITreeNode, Menu, NonIdealState, Spinner, Tag, TextArea, Tree
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ChangeProposal, ChangeRequest, DECISION_STATUSES, DISPOSITION_OPTIONS,
  ItemClassConfiguration, ItemDetailView, ItemEditView, Payload, PROPOSAL_TYPES,
  RegisterItem,
  RegisterItemDataHook,
  RegistryViewProps, RelatedItemClassConfiguration
} from '../types';
import { MainView } from './MainView';
import { _getRelatedClass } from './util';


const PROPOSAL_ICON: Record<typeof PROPOSAL_TYPES[number], IconName> = {
  addition: 'add',
  clarification: 'edit',
  amendment: 'remove',
}


export const CHANGE_REQUEST_OPTIONS: Record<string, IOptionProps> = {
  new: { value: 'new', label: "New change request…" },
} as const;


export const ChangeRequestView: React.FC<
  Pick<RegistryViewProps, 'itemClassConfiguration'> & {
  id: string
  useRegisterItemData: RegisterItemDataHook
  onSave?: (crID: string, newValue: ChangeRequest, oldValue: ChangeRequest) => Promise<void>
  onDelete?: (crID: string, oldValue: ChangeRequest) => Promise<void>
}> = function ({
    itemClassConfiguration, id,
    useRegisterItemData,
    onSave, onDelete }) {

  const { useRawObjectData, makeRandomID, changeObjects } = useContext(DatasetContext);

  const [selectedItem, selectItem] = useState<string>('justification');

  const objectPath = `change-requests/${id}.yaml`;
  const crData = useRawObjectData({ [objectPath]: 'utf-8' as const });
  const dataAsString = crData.value?.[objectPath]?.value || undefined;
  const maybeCR: ChangeRequest | Record<never, never> | undefined = dataAsString !== undefined
    ? yaml.load(dataAsString as string)
    : undefined;

  const itemDataRequest = Object.keys((maybeCR as ChangeRequest)?.proposals || {}).map(itemIDWithClass => {
    return { [itemIDWithClass]: 'utf-8' as const };
  }).reduce((p, c) => ({ ...p, ...c }), {});

  //log.debug("Item data request", itemDataRequest);
  //const itemData = useObjectData(itemDataRequest).value;

  const itemData: Record<string, RegisterItem<any>> = useRegisterItemData(itemDataRequest).value;

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

    async function handleAddProposal(id: string, defaults: Record<string, any>) {
      updateEdited(update(cr, { proposals: {
        [id]: { $set: { type: 'addition', payload: defaults } },
      } }))
    }

    async function handleAcceptProposal(itemID: string, clsID: string, proposal: ChangeProposal) {
      if (!changeObjects) {
        return;
      }

      const itemPath = `${clsID}/${itemID}`;
      const itemFilePath = `${itemPath}.yaml`;

      const existingItem = itemData[itemPath];

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
          [itemPath]: {
            newValue: yaml.dump(clarifiedItem, { noRefs: true }),
            oldValue: yaml.dump(existingItem, { noRefs: true }),
            encoding: 'utf-8' as const,
          },
        }, `CR: Accepted clarification of ${clsID}/${itemID} (per CR ${id})`);

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
          status: proposal.amendmentType === 'retirement' ? 'retired' : 'superseded',
        };
        if (proposal.amendmentType === 'supersession') {
          if (cr.proposals[`${clsID}/${proposal.supersedingItemID}`]?.type !== 'addition') {
            log.error("Cannot accept proposed amendment: superseding item is not specified or cannot be found", clsID, itemID);
            throw new Error("Cannot accept proposed amendment: superseding item is not specified or cannot be found");
          }
        }
        await changeObjects({
          [itemPath]: {
            newValue: yaml.dump(amendedItem, { noRefs: true }),
            oldValue: yaml.dump(existingItem, { noRefs: true }),
            encoding: 'utf-8' as const,
          },
        }, `CR: Accepted amendment of ${clsID}/${itemID} (per CR ${id})`);
      }
    }

    const tentativelyAccepted = cr.status === 'tentative' && cr.disposition === 'accepted';
    const tentativelyNotAccepted = cr.status === 'tentative' && cr.disposition === 'notAccepted';

    const actions = changeObjects !== undefined
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
        onChange={changeObjects
          ? (justification) => updateEdited({ ...cr, justification })
          : undefined}
      />;
    } else if (selectedItem === 'control-body') {
      detailView = <CRControlBodyInput
        value={{ notes: cr.controlBodyNotes, event: cr.controlBodyDecisionEvent }}
        onChange={changeObjects
          ? (controlBodyNotes, controlBodyDecisionEvent) =>
            updateEdited({ ...cr, controlBodyNotes, controlBodyDecisionEvent })
          : undefined}
      />;
    } else if (selectedItem === 'manager') {
      detailView = <CRManagerNotes
        value={cr.registerManagerNotes}
        onChange={changeObjects
          ? (registerManagerNotes) => updateEdited({ ...cr, registerManagerNotes })
          : undefined}
      />;
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
                  To propose a change, close this CR, navigate to an item you want to change in item list, and&nbsp;click “Propose&nbsp;a&nbsp;change”.
                </p>
                <p>
                  You won’t be able to edit your change request once you have submitted it.
                </p>
              </Callout>
              <Menu className={Classes.ELEVATION_1} style={{ marginBottom: '1rem' }}>
                <Menu.Divider title="New item" />
                {Object.entries(itemClassConfiguration).map(([classID, classCfg]) =>
                  <Menu.Item
                    key={classID}
                    icon="add"
                    text={classCfg.meta.title}
                    onClick={async () => handleAddProposal(
                      `${classCfg.meta.id}/${await makeRandomID()}`,
                      classCfg.defaults || {})}
                  />
                )}
              </Menu>
            </>
          : <Callout style={{ textAlign: 'left' }} title="Reviewing proposed changes" intent="primary">
              Select a proposed change on the left to view.
            </Callout>
        }
      />;
    } else if (cr.proposals[selectedItem] && (itemData[selectedItem] || cr.proposals[selectedItem].type === 'addition')) {
      const proposal = cr.proposals[selectedItem];
      const classID = selectedItem.split('/')[0];
      const classConfig = Object.values(itemClassConfiguration).find(cls => cls.meta.id === classID);
      const existingItemData = itemData[selectedItem];
      const getRelatedClass = _getRelatedClass(itemClassConfiguration);
      if (classConfig && (existingItemData || proposal.type === 'addition')) {
        try {
          detailView = <ProposalDetails
            value={proposal}
            classConfig={classConfig}
            existingItemData={existingItemData || undefined}
            getRelatedClass={getRelatedClass}
            useRegisterItemData={useRegisterItemData}
            onAccept={changeObjects
              ? (itemID, clsID) => handleAcceptProposal(itemID, clsID, proposal)
              : undefined}
            ItemView={(changeObjects && proposal.type !== 'amendment')
              ? classConfig.views.editView
              : classConfig.views.detailView}
            onChange={changeObjects
              ? (proposal) => updateEdited(update(cr, { proposals: { [selectedItem]: { $set: proposal } } }))
              : undefined}
            onDelete={changeObjects
              ? () => updateEdited(update(cr, { proposals: { $unset: [selectedItem] } }))
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
        <div css={css`flex-shrink: 0; width: 30vw; display: flex; flex-flow: column nowrap; background: ${Colors.WHITE}`}>
          <CRNavigation
            itemClassConfiguration={itemClassConfiguration}
            proposals={cr.proposals}
            itemData={itemData}
            onSelect={selectItem}
            selectedItem={selectedItem}
            enableControlBodyInput={changeObjects !== undefined || cr.controlBodyDecisionEvent !== undefined || cr.controlBodyNotes !== undefined}
            enableManagerNotes={changeObjects !== undefined || cr.registerManagerNotes !== undefined}
          />
        </div>

        <div css={css`flex: 1; padding: 1rem;`} className={Classes.ELEVATION_1}>
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
  Pick<RegistryViewProps, 'itemClassConfiguration'> & {
  proposals: ChangeRequest["proposals"]
  enableControlBodyInput: boolean
  enableManagerNotes: boolean
  itemData: Record<string, RegisterItem<any>>,
  selectedItem: string
  onSelect: (item: string) => void
}> =
function ({
    itemData, proposals, itemClassConfiguration,
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
    childNodes: [ ...Object.entries(proposals).map(([itemIDWithClass, proposal]) => {
      const [classID, itemID] = itemIDWithClass.split('/');
      const clsConfig = Object.values(itemClassConfiguration).find(cls => cls.meta.id === classID);
      const View = clsConfig?.views.listItemView;
      const data = itemData[itemIDWithClass]?.data || undefined;

      let label: JSX.Element;

      if (!View) {
        label = <span>{itemIDWithClass}</span>;
      } else if (proposal.type === 'addition') {
        label = <View
          itemID={itemID}
          css={css`white-space: nowrap;`}
          getRelatedItemClassConfiguration={getRelatedClass}
          itemData={proposal.payload} />;
      } else if (data !== undefined) {
        label = <View
          itemID={itemID}
          css={css`white-space: nowrap;`}
          getRelatedItemClassConfiguration={getRelatedClass}
          itemData={data} />;
      } else {
        label = <span>Unable to read item</span>;
      }

      return {
        isSelected: selectedItem === itemIDWithClass,
        id: itemIDWithClass,
        icon: PROPOSAL_ICON[proposal.type] as IconName,
        secondaryLabel: <Tag
            minimal css={css`white-space: nowrap;`}
            title={clsConfig?.meta.title}>
          {Object.entries(itemClassConfiguration).
            find(([_, cfg]) => cfg.meta.id === classID)?.[0] ||
            clsConfig?.meta.title}
        </Tag>,
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
        disabled={!onChange} value={value || ''}
        onChange={(evt) => onChange ? onChange(evt.currentTarget.value || undefined) : void 0} />
    </FormGroup>
  );
};


const ProposalDetails: React.FC<{
  value: ChangeProposal
  classConfig: ItemClassConfiguration<any>

  getRelatedClass: (clsID: string) => RelatedItemClassConfiguration
  useRegisterItemData: RegisterItemDataHook

  existingItemData?: Payload
  ItemView?: ItemEditView<any> | ItemDetailView<any>

  onAccept?: (itemID: string, clsID: string) => void
  onChange?: (val: ChangeProposal) => void
  onDelete?: () => void
}> = function ({
    value, onChange, ItemView,
    existingItemData, classConfig, getRelatedClass,
    useRegisterItemData }) {
  let itemView: JSX.Element;
  let proposalProperties: JSX.Element | null;

  if (value.type === 'amendment') {
    proposalProperties = (
      <FormGroup inline label="Supersede with:">
        <InputGroup
          value={value.amendmentType === 'supersession' ? value.supersedingItemID : ''}
          disabled={!onChange}
          placeholder="Item ID"
          onChange={onChange
            ? (evt: React.FormEvent<HTMLInputElement>) => {
                if (!onChange) { return; }
                const itemID = evt.currentTarget.value;
                if (itemID.trim() === '') {
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

  const itemData: Payload | undefined = value.type === 'addition' ? value.payload : existingItemData;

  if (itemData === undefined) {
    itemView = <NonIdealState icon="heart-broken" title="Unable to display this item" />;
  } else if (onChange && value.type !== 'amendment') {
    const View = ItemView as ItemEditView<any>;
    itemView = <View
      itemData={itemData}
      getRelatedItemClassConfiguration={getRelatedClass}
      onChange={onChange
        ? (payload) => onChange ? onChange({ ...value, payload }) : void 0
        : undefined} />;
  } else {
    const View = ItemView as ItemDetailView<any>;
    itemView = <View
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

  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap;`}>
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
        {proposalProperties}
      </div>

      <div css={css`flex: 1; overflow-y: auto;`}>
        {itemView}
      </div>
    </div>
  );
};
