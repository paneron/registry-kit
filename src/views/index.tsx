/** @jsx jsx */

import log from 'electron-log';

import React, { useContext, useState } from 'react';
import { jsx } from '@emotion/core';
import { NonIdealState, } from '@blueprintjs/core';

import { ValueHook } from '@riboseinc/paneron-extension-kit/types';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import {
  ChangeRequest,
  //Register,
  RegisterItem,
  RegisterItemDataHook,
  RegistryViewProps,
} from '../types';
//import { RegisterInformation } from './RegisterInformation';
import { ChangeRequestView } from './ChangeRequest';
import { RegisterItemBrowser } from './ItemBrowser';
//import { REGISTER_METADATA_FILENAME } from '../common';


import GenericRelatedItemView from './GenericRelatedItemView';
export { GenericRelatedItemView };


//function makeBlankCR(id: string, sponsor: RegisterStakeholder): ChangeRequest {
//  return {
//    id,
//    justification: '',
//    timeStarted: new Date(),
//    proposals: {},
//    sponsor,
//    status: DECISION_STATUSES[0],
//  };
//};


export const RegistryView: React.FC<RegistryViewProps> = function ({ itemClassConfiguration, subregisters }) {

  const {
    useObjectData,
    updateObjects,
  } = useContext(DatasetContext);

  //const [registerInfoOpen, setRegisterInfoOpen] = useState(false);
  const [selectedCRID, selectCR] = useState<string | undefined>(undefined);
  const [isBusy, setBusy] = useState(false);

  //const remoteUsername: string | undefined = useRemoteUsername().value.username;

  // const registerObject = useObjectData({
  //   objectPaths: [REGISTER_METADATA_FILENAME],
  // }).value.data?.[REGISTER_METADATA_FILENAME]?.value;

  // const registerInfo: Partial<Register> | null = registerObject
  //   ? yaml.load(registerObject as string)
  //   : null;

  // const stakeholder: RegisterStakeholder | undefined = remoteUsername
  //   ? (registerInfo?.stakeholders || []).
  //     find(s => s.gitServerUsername === remoteUsername)
  //   : undefined;

  const useRegisterItemData: RegisterItemDataHook = (opts) => {
    const result = useObjectData({
      objectPaths: opts.itemPaths,
    }) as ValueHook<{ data: Record<string, RegisterItem<any> | null> }>;

    //const parsedData = Object.entries(data.value).
    //filter(([ path, data ]) => data !== null && data.encoding === 'utf-8').
    //map(([ path, data ]) => {
    //  const item: RegisterItem<any> = yaml.load(data!.value as string);
    //  return { [path.replace('.yaml', '')]: item };
    //}).
    //reduce((p, c) => ({ ...p, ...c }), {});

    return {
      isUpdating: false,
      errors: [],
      value: result.value.data,
      refresh: () => void 0,
      _reqCounter: 0,
    };
  };

  // async function handleSaveRegisterInfo(value: Partial<Register>, oldValue: Partial<Register> | null) {
  //   if (!isBusy && updateObjects) {
  //     setBusy(true);
  //     try {
  //       await updateObjects({
  //         commitMessage: "Edit register metadata",
  //         objectChangeset: {
  //           [REGISTER_METADATA_FILENAME]: {
  //             oldValue: oldValue ? oldValue : null,
  //             newValue: value,
  //           },
  //         },
  //       });
  //     } finally {
  //       setBusy(false);
  //     }
  //   }
  // }

  async function handleSaveCR(crID: string, value: ChangeRequest | null, oldValue: ChangeRequest) {
    if (!isBusy && crID === selectedCRID && updateObjects) {
      setBusy(true);
      try {
        await updateObjects({
          commitMessage: `CR: ${value === null ? 'delete' : 'update'} ${crID}`,
          objectChangeset: {
            [`change-requests/${crID}.yaml`]: {
              oldValue: oldValue,
              newValue: value ?? null,
            },
          },
        }, );
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

  let mainViewEl: JSX.Element;

  /*if (registerInfoOpen) {
    mainViewEl = <RegisterInformation
      register={registerInfo}
      onSave={(!isBusy && updateObjects !== undefined)
        ? handleSaveRegisterInfo
        : undefined}
    />;

  } else */ if (selectedCRID) {
    mainViewEl = <ChangeRequestView
      id={selectedCRID}
      itemClassConfiguration={itemClassConfiguration}
      useRegisterItemData={useRegisterItemData}

      onDelete={(!isBusy && updateObjects !== undefined)
        ? (crID, oldValue) => handleSaveCR(crID, null, oldValue)
        : undefined}
      onSave={(!isBusy && updateObjects !== undefined)
        ? handleSaveCR
        : undefined}
    />;

  } else {
    mainViewEl = <RegisterItemBrowser
      itemClassConfiguration={itemClassConfiguration}
      subregisters={subregisters}
      useRegisterItemData={useRegisterItemData}
    />;
  }

  return mainViewEl;
};


export const nonIdeal = <NonIdealState
  icon="time"
  title="Check back in a bit!"
  description="This view is coming soon" />;
