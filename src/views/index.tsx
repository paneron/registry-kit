/** @jsx jsx */

import yaml from 'js-yaml';
import log from 'electron-log';

import React, { useContext, useEffect, useState } from 'react';
import { css, jsx } from '@emotion/core';
import { NonIdealState, } from '@blueprintjs/core';

import { ObjectDataRequest } from '@riboseinc/paneron-extension-kit/types';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ChangeRequest,
  DECISION_STATUSES,
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
  const [isBusy, setBusy] = useState(false);

  const remoteUsername: string | undefined = 'demouser'; //useRemoteUsername().value.username;

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

  async function handleSelectCR(crID: string | undefined) {
    console.debug("handleSelectCR", crID, CHANGE_REQUEST_OPTIONS.new.value && stakeholder?.gitServerUsername !== undefined && changeObjects);
    if (crID === undefined) {
      selectCR(undefined);

    } else if (crID === CHANGE_REQUEST_OPTIONS.new.value) {

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
          setTimeout(() => selectCR(newID), 1000);
        } finally {
          setBusy(false);
        }

      } else {
        selectCR(undefined);
      }

    } else {
      selectCR(crID);
    }
  }



  let mainViewEl: JSX.Element;

  if (registerInfoOpen) {
    mainViewEl = <RegisterInformation
      register={registerInfo}
      onSave={(!isBusy && changeObjects !== undefined)
        ? handleSaveRegisterInfo
        : undefined}
    />;

  } else if (selectedCRID) {
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
        onOpenRegisterInfo={(selectedCRID === undefined && !isBusy)
          ? setRegisterInfoOpen
          : undefined}

        selectedCRID={selectedCRID}
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
