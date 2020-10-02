/** @jsx jsx */

import log from 'electron-log';

import yaml from 'js-yaml';
import update from 'immutability-helper';

import { jsx, css } from '@emotion/core';

import {
  Button, ButtonGroup, Classes,
  Colors,
  FormGroup, H4, HTMLSelect, IconName, InputGroup, IOptionProps,
  ITreeNode, Menu, NonIdealState, Popover, Spinner, Tag, TextArea, Tree
} from '@blueprintjs/core';

import { PluginFC } from '@riboseinc/paneron-extension-kit/types';
import {
  ChangeProposal, ChangeRequest, DECISION_STATUSES, DISPOSITION_OPTIONS,
  ItemClassConfiguration, ItemDetailView, ItemEditView, Payload, PROPOSAL_TYPES,
  RegisterItem,
  RegisterItemDataHook,
  RegisterStakeholder, RegistryViewProps, RelatedItemClassConfiguration
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


export const ChangeRequestView: PluginFC<
  Pick<RegistryViewProps, 'useObjectData' | 'useObjectPaths' | 'itemClassConfiguration' | 'makeRandomID' | 'changeObjects'> & {
  id: string
  stakeholder?: RegisterStakeholder
  useRegisterItemData: RegisterItemDataHook
  onSave?: (crID: string, newValue: ChangeRequest, oldValue: ChangeRequest) => Promise<void>
  onDelete?: (crID: string, oldValue: ChangeRequest) => Promise<void>
}> = function ({
    React,
    useObjectData, useObjectPaths, makeRandomID,
    itemClassConfiguration, id, stakeholder,
    changeObjects,
    useRegisterItemData,
    onSave, onDelete }) {

  const [selectedItem, selectItem] = React.useState<string>('justification');

  const objectPath = `change-requests/${id}.yaml`;
  const crData = useObjectData({ [objectPath]: 'utf-8' as const });
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

  const [edited, updateEdited] = React.useState<ChangeRequest | null>(null);

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

    async function handleAcceptProposal(itemID: string, clsID: string, proposal: ChangeProposal) {
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
          changeRequestID: id,
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
          changeRequestID: id,
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
          changeRequestID: id,
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

    const isMyCR = cr.sponsor.gitServerUsername === stakeholder?.gitServerUsername;

    const canDelete = onDelete && cr.timeProposed === undefined && isMyCR;
    const canPropose = onSave && (cr.timeProposed === undefined || cr.disposition === 'withdrawn') && isMyCR;
    const canEdit = onSave && cr.timeProposed === undefined && isMyCR;
    const canWithdraw = onSave && cr.timeProposed !== undefined && cr.timeDisposed === undefined && isMyCR && cr.disposition !== 'withdrawn';
    const canReview = onSave && cr.timeProposed !== undefined && (stakeholder?.role === 'manager' || stakeholder?.role === 'owner');
    const canDispose = onSave && cr.timeProposed !== undefined && cr.timeDisposed === undefined && (stakeholder?.role === 'manager' || stakeholder?.role === 'owner');

    const tentativelyAccepted = cr.status === 'tentative' && cr.disposition === 'accepted';
    const tentativelyNotAccepted = cr.status === 'tentative' && cr.disposition === 'notAccepted';

    const actions = (canPropose || canWithdraw || canDispose)
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
          Status: <em>{cr.status || '—'}</em>
          &emsp;•&emsp;
          Disposition: <em>{cr.disposition || '—'}</em>
        </React.Fragment>;

    let detailView: JSX.Element;
    if (selectedItem === 'justification') {
      detailView = <CRJustification
        React={React}
        value={cr.justification}
        onChange={canEdit
          ? (justification) => updateEdited({ ...cr, justification })
          : undefined}
      />;
    } else if (selectedItem === 'control-body') {
      detailView = <CRControlBodyInput
        React={React}
        value={{ notes: cr.controlBodyNotes, event: cr.controlBodyDecisionEvent }}
        onChange={canReview
          ? (controlBodyNotes, controlBodyDecisionEvent) =>
            updateEdited({ ...cr, controlBodyNotes, controlBodyDecisionEvent })
          : undefined}
      />;
    } else if (selectedItem === 'manager') {
      detailView = <CRManagerNotes
        React={React}
        value={cr.registerManagerNotes}
        onChange={canReview
          ? (registerManagerNotes) => updateEdited({ ...cr, registerManagerNotes })
          : undefined}
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
            React={React}
            value={proposal}
            classConfig={classConfig}
            existingItemData={existingItemData || undefined}
            getRelatedClass={getRelatedClass}
            useRegisterItemData={useRegisterItemData}
            onAccept={canReview
              ? (itemID, clsID) => handleAcceptProposal(itemID, clsID, proposal)
              : undefined}
            ItemView={(canEdit && proposal.type !== 'amendment')
              ? classConfig.views.editView
              : classConfig.views.detailView}
            onChange={canEdit
              ? (proposal) => updateEdited(update(cr, { proposals: { [selectedItem]: { $set: proposal } } }))
              : undefined}
            onDelete={canEdit
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
      <MainView React={React} title="Change request" secondaryTitle={actions}>
        <div css={css`flex-shrink: 0; width: 30vw; display: flex; flex-flow: column nowrap; background: ${Colors.WHITE}`}>
          <CRNavigation
            React={React}
            itemClassConfiguration={itemClassConfiguration}
            proposals={cr.proposals}
            itemData={itemData}
            onSelect={selectItem}
            selectedItem={selectedItem}
            makeRandomID={makeRandomID}

            onAddProposal={canEdit
              ? async (id, defaults) => updateEdited(update(cr, { proposals: {
                  [id]: { $set: { type: 'addition', payload: defaults } },
                } }))
              : undefined}

            enableControlBodyInput={canReview || cr.controlBodyDecisionEvent !== undefined || cr.controlBodyNotes !== undefined}
            enableManagerNotes={canReview || cr.registerManagerNotes !== undefined}
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


const CRNavigation: PluginFC<
  Pick<RegistryViewProps, 'itemClassConfiguration' | 'makeRandomID'> & {
  proposals: ChangeRequest["proposals"]
  enableControlBodyInput: boolean
  enableManagerNotes: boolean
  itemData: Record<string, RegisterItem<any>>,
  selectedItem: string
  onSelect: (item: string) => void
  onAddProposal?: (itemIDWithClass: string, defaults: Payload) => void
}> =
function ({
    React, itemData, proposals, itemClassConfiguration,
    onSelect, onAddProposal, makeRandomID,
    selectedItem, enableControlBodyInput, enableManagerNotes }) {

  function handleSelect(node: ITreeNode) {
    if (node.id !== 'proposals') {
      onSelect(node.id as string);
    }
  }

  async function handleAddNew(classCfg: ItemClassConfiguration<any>) {
    if (!onAddProposal) { return; }
    return onAddProposal(
      `${classCfg.meta.id}/${await makeRandomID()}`,
      classCfg.defaults);
  }

  const addMenu: JSX.Element | null = onAddProposal ? (
    <Popover
        content={<Menu>
          {Object.entries(itemClassConfiguration).map(([classID, classCfg]) =>
            <Menu.Item key={classID} text={classCfg.meta.title} onClick={() => handleAddNew(classCfg)} />
          )}
        </Menu>}>
      <Button minimal small icon="add" />
    </Popover>
  ) : null;

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
    secondaryLabel: addMenu,
    childNodes: [ ...Object.entries(proposals).map(([itemIDWithClass, proposal]) => {
      const classID = itemIDWithClass.split('/')[0]
      const clsConfig = Object.values(itemClassConfiguration).find(cls => cls.meta.id === classID);
      const View = clsConfig?.views.listItemView;
      const data = itemData[itemIDWithClass]?.data || undefined;

      let label: JSX.Element;

      if (!View) {
        label = <span>{itemIDWithClass}</span>;
      } else if (proposal.type === 'addition') {
        label = <View
          css={css`white-space: nowrap;`}
          getRelatedItemClassConfiguration={getRelatedClass}
          React={React}
          itemData={proposal.payload} />;
      } else if (data !== undefined) {
        label = <View
          css={css`white-space: nowrap;`}
          getRelatedItemClassConfiguration={getRelatedClass}
          React={React}
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


const CRJustification: PluginFC<{
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


const CRControlBodyInput: PluginFC<{
  value: { notes: string | undefined, event: string | undefined }
  onChange?: (notes: string | undefined, event: string | undefined) => void
}> = function ({ React, value, onChange }) {
  function handleNotesChange(evt: React.FormEvent<HTMLTextAreaElement>) {
    onChange ? onChange(evt.currentTarget.value || undefined, value.event) : void 0;
  }
  function handleEventChange(evt: React.FormEvent<HTMLTextAreaElement>) {
    onChange ? onChange(value.notes, evt.currentTarget.value || undefined) : void 0;
  }
  return (
    <React.Fragment>
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
    </React.Fragment>
  );
};


const CRManagerNotes: PluginFC<{
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


const ProposalDetails: PluginFC<{
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
    React, value, onChange, ItemView,
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
      React={React}
      itemData={itemData}
      getRelatedItemClassConfiguration={getRelatedClass}
      onChange={onChange
        ? (payload) => onChange ? onChange({ ...value, payload }) : void 0
        : undefined} />;
  } else {
    const View = ItemView as ItemDetailView<any>;
    itemView = <View
      React={React}
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
