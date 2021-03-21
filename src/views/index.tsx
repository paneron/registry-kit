/** @jsx jsx */

import yaml from 'js-yaml';
import log from 'electron-log';

import React, { useContext, useEffect, useState } from 'react';
import { css, jsx } from '@emotion/core';
import { NonIdealState, } from '@blueprintjs/core';

import { ObjectDataRequest } from '@riboseinc/paneron-extension-kit/types';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ChangeProposal,
  ChangeRequest,
  DECISION_STATUSES,
  ItemAction,
  Register,
  RegisterItem,
  RegisterItemDataHook,
  RegisterStakeholder,
  RegistryViewProps,
} from '../types';
import { RegisterInformation } from './RegisterInformation';
import { ChangeRequestView, CHANGE_REQUEST_OPTIONS } from './ChangeRequest';
import { RegisterItemBrowser } from './ItemBrowser';
import { Toolbar } from './Toolbar';
import { REGISTER_METADATA_FILENAME } from '../common';


function makeBlankCR(id: string, sponsor: RegisterStakeholder): ChangeRequest {
  return {
    id,
    justification: '',
    timeStarted: new Date(),
    proposals: {},
    sponsor,
    status: DECISION_STATUSES[0],
  };
};


export const RegistryView: React.FC<RegistryViewProps> = function ({ itemClassConfiguration, subregisters }) {

  const {
    title,
    useObjectData,
    changeObjects,
    makeRandomID,
  } = useContext(DatasetContext);

  const [registerInfoOpen, setRegisterInfoOpen] = useState(false);
  const [selectedSubregisterID, selectSubregisterID] = useState<undefined | string>(undefined);
  const [selectedCRID, selectCR] = useState<string | undefined>(undefined);
  const [enteredCR, setEnteredCR] = useState(false);
  const [isBusy, setBusy] = useState(false);

  const remoteUsername: string | undefined = 'demouser'; //useRemoteUsername().value.username;

  const objectPath = `change-requests/${selectedCRID ?? 'NONEXISTENT_CR'}.yaml`;
  const crDataRaw = useObjectData({ [objectPath]: 'utf-8' as const }).value[objectPath];
  const crData: ChangeRequest | undefined = crDataRaw?.encoding === 'utf-8'
    ? yaml.load(crDataRaw.value)
    : undefined;

  const registerObject = useObjectData({ [REGISTER_METADATA_FILENAME]: 'utf-8' }).value[REGISTER_METADATA_FILENAME]?.value;
  const registerInfo: Partial<Register> | null = registerObject
    ? yaml.load(registerObject as string)
    : null;

  const stakeholder: RegisterStakeholder | undefined = remoteUsername
    ? (registerInfo?.stakeholders ?? []).
      find(s => s.gitServerUsername === remoteUsername)
    : undefined;

  useEffect(() => {
    const subregisterIDs = Object.keys(subregisters || {});
    if (subregisterIDs.length > 0) {
      selectSubregisterID(subregisterIDs[0]);
    }
  }, [Object.keys(subregisters || {}).length]);

  const useRegisterItemData: RegisterItemDataHook = (paths: ObjectDataRequest) => {
    const dataRequest: ObjectDataRequest = Object.keys(paths).map(path => {
      return { [`${path}.yaml`]: 'utf-8' as const };
    }).reduce((p, c) => ({ ...p, ...c }), {});

    const data = useObjectData(dataRequest);

    const parsedData = Object.entries(data.value).
    filter(([ path, data ]) => data !== null && data.encoding === 'utf-8').
    map(([ path, data ]) => {
      const item: RegisterItem<any> = yaml.load(data!.value as string);
      return { [path.replace('.yaml', '')]: item };
    }).
    reduce((p, c) => ({ ...p, ...c }), {});

    return {
      ...data,
      value: parsedData,
    };
  };

  async function handleSaveRegisterInfo(value: Partial<Register>, oldValue: Partial<Register> | null) {
    if (!isBusy && changeObjects) {
      setBusy(true);
      try {
        await changeObjects({
          [REGISTER_METADATA_FILENAME]: {
            oldValue: oldValue ? yaml.dump(oldValue, { noRefs: true }) : null,
            newValue: yaml.dump(value, { noRefs: true }),
            encoding: 'utf-8',
          },
        }, "Edit register info", true);
      } finally {
        setBusy(false);
      }
    }
  }

  async function handleSaveCR(crID: string, value: ChangeRequest | null, oldValue: ChangeRequest) {
    if (!isBusy && crID === selectedCRID && changeObjects) {
      setBusy(true);
      try {
        await changeObjects({
          [`change-requests/${crID}.yaml`]: {
            oldValue: yaml.dump(oldValue, { noRefs: true }),
            newValue: value ? yaml.dump(value, { noRefs: true }) : null,
            encoding: 'utf-8',
          },
        }, `CR: ${value === null ? 'delete' : 'update'} ${crID}`);
        if (value === null) {
          selectCR(undefined);
        }
      } catch (e) {
        log.error("Failed to update or delete CR!", e);
      } finally {
        setBusy(false);
      }
    }
  }

  async function handleAddProposal(itemID: string, proposal: ChangeProposal) {
    if (!isBusy && crData !== undefined && selectedCRID && changeObjects) {
      setBusy(true);
      try {
        log.debug("Adding proposal", itemID, proposal);
        log.debug("CR data", crData);
        const newCRData = {
          ...crData,
          proposals: { ...crData.proposals, [itemID]: proposal } 
        };
        log.debug("New CR data", newCRData);
        await changeObjects({
          [`change-requests/${selectedCRID}.yaml`]: {
            oldValue: yaml.dump(crData, { noRefs: true }),
            newValue: yaml.dump(newCRData, { noRefs: true }),
            encoding: 'utf-8',
          },
        }, `CR: Add proposal to ${selectedCRID}`);
      } finally {
        setBusy(false);
      }
    }
  }

  async function handleSelectCR(crID: string | undefined) {
    selectCR(crID);
  }

  async function handleEnterCR() {
    console.debug("entering cr", selectedCRID);
    if (selectedCRID === undefined || selectedCRID === CHANGE_REQUEST_OPTIONS.new.value) {

      if (stakeholder?.gitServerUsername !== undefined && changeObjects) {
        console.debug("handleSelectCR: GO");
        setBusy(true);
        try {
          const newID = await makeRandomID();
          console.debug("handleSelectCR", newID);
          await changeObjects({
            [`change-requests/${newID}.yaml`]: {
              oldValue: null,
              newValue: yaml.dump(makeBlankCR(newID, stakeholder), { noRefs: true }),
              encoding: 'utf-8',
            },
          }, `CR: Start ${newID}`);
          console.debug("handleSelectCR: changed objects");
          setTimeout(() => { selectCR(newID); setEnteredCR(true); }, 1000);
        } finally {
          setBusy(false);
        }

      } else {
        setEnteredCR(false);
      }

    } else {
      setEnteredCR(true);
    }
  }

  const enableCRActions = selectedCRID && selectedCRID !== CHANGE_REQUEST_OPTIONS.new.value && !isBusy;
  const itemCRActions: ItemAction[] = [{
    getButtonProps: (item, itemClass, subregisterID) => ({
      text: "Clarify in selected change request",
      onClick: () => handleAddProposal(item.id, {
        type: 'clarification',
        payload: item.data,
        classID: itemClass.meta.id,
        subregisterID,
      }),
      disabled: !enableCRActions,
    }),
  }, {
    getButtonProps: (item, itemClass, subregisterID) => ({
      text: "Supersede",
      onClick: () => handleAddProposal(item.id, {
        type: 'amendment',
        classID: itemClass.meta.id,
        subregisterID,
        amendmentType: 'supersession',
        supersedingItemID: '',
      }),
      disabled: !enableCRActions || itemClass.itemCanBeSuperseded === false,
    }),
  }, {
    getButtonProps: (item, itemClass, subregisterID) => ({
      text: "Retire",
      onClick: () => handleAddProposal(item.id, {
        type: 'amendment',
        amendmentType: 'retirement',
        classID: itemClass.meta.id,
        subregisterID,
      }),
      disabled: !enableCRActions,
    }),
  }];

  let mainViewEl: JSX.Element;

  if (registerInfoOpen) {
    mainViewEl = <RegisterInformation
      register={registerInfo}
      onSave={(!isBusy && changeObjects !== undefined)
        ? handleSaveRegisterInfo
        : undefined}
    />;

  } else if (selectedCRID && enteredCR) {
    mainViewEl = <ChangeRequestView
      id={selectedCRID}
      stakeholder={stakeholder}
      subregisters={subregisters}
      itemClassConfiguration={itemClassConfiguration}
      useRegisterItemData={useRegisterItemData}

      onDelete={(!isBusy && changeObjects !== undefined)
        ? (crID, oldValue) => handleSaveCR(crID, null, oldValue)
        : undefined}
      onSave={(!isBusy && changeObjects !== undefined)
        ? handleSaveCR
        : undefined}
    />;

  } else {
    mainViewEl = <RegisterItemBrowser
      itemClassConfiguration={itemClassConfiguration}
      onSubregisterChange={selectSubregisterID}
      selectedSubregisterID={selectedSubregisterID}
      itemActions={itemCRActions}
      availableClassIDs={selectedSubregisterID
        ? subregisters?.[selectedSubregisterID]?.itemClasses
        : undefined}
      useRegisterItemData={useRegisterItemData}
    />;
  }

  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`}>

      <Toolbar
        title={title}

        register={registerInfo || {}}
        stakeholder={stakeholder}

        subregisters={subregisters}
        selectedSubregisterID={selectedSubregisterID}
        onSelectSubregister={selectSubregisterID}

        registerInfoOpen={registerInfoOpen}
        onOpenRegisterInfo={(enteredCR === false && !isBusy)
          ? setRegisterInfoOpen
          : undefined}

        selectedCRID={selectedCRID}
        enteredCR={enteredCR}
        onEnterCR={(!registerInfoOpen && !isBusy)
          ? handleEnterCR
          : undefined}
        onExitCR={() => { setEnteredCR(false); selectCR(CHANGE_REQUEST_OPTIONS.new.value as string); }}
        onSelectCR={(!registerInfoOpen && !isBusy)
          ? handleSelectCR
          : undefined}
      />

      {mainViewEl}

    </div>
  );
};


export const nonIdeal = <NonIdealState
  icon="time"
  title="Check back in a bit!"
  description="This view is coming soon" />;
