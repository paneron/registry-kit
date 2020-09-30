/** @jsx jsx */

import yaml from 'js-yaml';
import log from 'electron-log';

import { css, jsx } from '@emotion/core';
import { NonIdealState, } from '@blueprintjs/core';

import {
  ChangeRequest, DECISION_STATUSES,
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
import { ObjectDataRequest } from '@riboseinc/paneron-plugin-kit/types';


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


export const RegistryView: React.FC<RegistryViewProps> =
function ({
    React, makeRandomID, title,
    useObjectsChangedEvent, useObjectPaths, useObjectData,
    useRemoteUsername,
    itemClassConfiguration,
    changeObjects }) {

  const [registerInfoOpen, setRegisterInfoOpen] = React.useState(false);
  const [selectedCRID, selectCR] = React.useState<string | undefined>(undefined);
  const [isBusy, setBusy] = React.useState(false);

  const remoteUsername: string | undefined = useRemoteUsername().value.username;

  const registerObject = useObjectData({ 'register.yaml': 'utf-8' }).value['register.yaml']?.value;
  const registerInfo: Partial<Register> | null = registerObject ? yaml.load(registerObject as string) : null;

  const stakeholder: RegisterStakeholder | undefined = remoteUsername
    ? (registerInfo?.stakeholders || []).
      find(s => s.gitServerUsername === remoteUsername)
    : undefined;

  useObjectsChangedEvent(async ({ objects }) => {
    log.debug("Event: Repo contents changed", objects);
  }, []);

  const useRegisterItemData: RegisterItemDataHook = (paths: ObjectDataRequest) => {
    console.debug("Querying register items", paths);

    const dataRequest: ObjectDataRequest = Object.keys(paths).map(path => {
      return { [`${path}.yaml`]: 'utf-8' as const };
    }).reduce((p, c) => ({ ...p, ...c }), {});

    const data = useObjectData(dataRequest);

    console.debug("Got register items raw", Object.keys(data.value));

    const parsedData = Object.entries(data.value).
    filter(([ path, data ]) => data !== null && data.encoding === 'utf-8').
    map(([ path, data ]) => {
      const item: RegisterItem<any> = yaml.load(data!.value as string);
      return { [path.replace('.yaml', '')]: item };
    }).
    reduce((p, c) => ({ ...p, ...c }), {});

    return {
      ...data,
      value: parsedData
    };
  }

  async function handleSaveRegisterInfo(value: Partial<Register>, oldValue: Partial<Register> | null) {
    if (!isBusy) {
      setBusy(true);
      log.debug("Saving register information", value, oldValue);
      try {
        await changeObjects({
          'register.yaml': {
            oldValue: oldValue ? yaml.dump(oldValue, { noRefs: true }) : null,
            newValue: yaml.dump(value, { noRefs: true }),
            encoding: 'utf-8',
          },
        }, "Edit register info");
      } finally {
        setBusy(false);
      }
    }
  }

  async function handleSaveCR(crID: string, value: ChangeRequest | null, oldValue: ChangeRequest) {
    if (!isBusy && crID === selectedCRID) {
      setBusy(true);
      log.debug("Saving CR", value, oldValue);
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
    if (crID === undefined) {
      selectCR(undefined);

    } else if (crID === CHANGE_REQUEST_OPTIONS.new.value && stakeholder?.gitServerUsername !== undefined) {
      setBusy(true);
      try {
        const newID = await makeRandomID();
        await changeObjects({
          [`change-requests/${newID}.yaml`]: {
            oldValue: null,
            newValue: yaml.dump(makeBlankCR(newID, stakeholder)),
            encoding: 'utf-8',
          },
        }, `CR: Start ${newID}`);
        setTimeout(() => selectCR(newID), 1000);
      } finally {
        setBusy(false);
      }

    } else {
      selectCR(crID);
    }
  }

  let mainViewEl: JSX.Element;

  if (registerInfoOpen) {
    mainViewEl = <RegisterInformation
      React={React}
      register={registerInfo}
      stakeholder={stakeholder}
      onSave={(!isBusy && (stakeholder?.role === 'owner' || registerInfo?.stakeholders === undefined))
        ? handleSaveRegisterInfo
        : undefined}

    />;
  } else if (selectedCRID) {
    if (stakeholder) {
      mainViewEl = <ChangeRequestView
        React={React}
        id={selectedCRID}
        itemClassConfiguration={itemClassConfiguration}

        useObjectData={useObjectData}
        useObjectPaths={useObjectPaths}
        changeObjects={changeObjects}
        useRegisterItemData={useRegisterItemData}
        makeRandomID={makeRandomID}

        stakeholder={stakeholder}
        onDelete={(!isBusy && stakeholder !== undefined)
          ? (crID, oldValue) => handleSaveCR(crID, null, oldValue)
          : undefined}
        onSave={(!isBusy && stakeholder !== undefined)
          ? handleSaveCR
          : undefined}
      />;
    } else {
      mainViewEl = <NonIdealState
        icon="heart-broken"
        title="Cannot open change request"
        description="Your stakeholder information is missing" />;
    }
  } else {
    mainViewEl = <RegisterItemBrowser
      React={React}
      itemClassConfiguration={itemClassConfiguration}
      useRegisterItemData={useRegisterItemData}
      useObjectData={useObjectData}
      useObjectPaths={useObjectPaths}
    />;
  }

  return (
    <div css={css`flex: 1; display: flex; flex-flow: column nowrap; overflow: hidden;`}>

      {mainViewEl}

      <Toolbar
        React={React}
        title={title}

        registerInfoOpen={registerInfoOpen}
        onOpenRegisterInfo={(selectedCRID === undefined && !isBusy)
          ? setRegisterInfoOpen
          : undefined}

        selectedCRID={selectedCRID}
        onSelectCR={(!registerInfoOpen && !isBusy)
          ? handleSelectCR
          : undefined}

        register={registerInfo || {}}
        stakeholder={stakeholder}

        useObjectData={useObjectData}
        useObjectPaths={useObjectPaths}
      />
    </div>
  );
};


export const nonIdeal = <NonIdealState
  icon="time"
  title="Check back in a bit!"
  description="This view is coming soon" />;
