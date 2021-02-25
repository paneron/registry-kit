/** @jsx jsx */
/** @jsxFrag React.Fragment */

import yaml from 'js-yaml';

import { useContext } from 'react';

import { css, jsx } from '@emotion/core';

import {
  Button, Colors, ControlGroup, IButtonProps, IOptionProps,
  Navbar, NavbarHeading,
  HTMLSelect,
  Tooltip,
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { ChangeRequest, Register, RegisterStakeholder, Subregisters } from '../types';
import { CHANGE_REQUEST_OPTIONS } from './ChangeRequest';


const NO_SELECTED_SUBREGISTER_OPTION = '—';


export const Toolbar: React.FC<{
  title: string
  register: Partial<Register>
  stakeholder: RegisterStakeholder | undefined

  registerInfoOpen: boolean
  onOpenRegisterInfo?: (state: boolean) => void

  subregisters?: Subregisters<any>
  selectedSubregisterID?: string
  onSelectSubregister?: (subregID: string | undefined) => void

  selectedCRID?: string
  onSelectCR?: (crID: string | undefined) => void
  enteredCR: boolean
  onEnterCR?: () => void
  onExitCR?: () => void
}> = function ({
  register,
  stakeholder,
  registerInfoOpen,
  onOpenRegisterInfo,

  subregisters,
  selectedSubregisterID,
  onSelectSubregister,

  selectedCRID,
  onSelectCR,
  enteredCR,
  onEnterCR,
  onExitCR,
}) {

  const registerInfoComplete = (
    register.id !== undefined &&
    register.name !== undefined &&
    register.contentSummary !== undefined &&
    register.uniformResourceIdentifier !== undefined &&
    register.operatingLanguage !== undefined &&
    register.alternativeLanguages !== undefined &&
    register.stakeholders !== undefined
  );

  const _registerInfoButtonProps: Partial<IButtonProps> = {
    disabled: !onOpenRegisterInfo,
    active: registerInfoOpen,
    onClick: () => onOpenRegisterInfo ? onOpenRegisterInfo(!registerInfoOpen) : void 0,
  };

  const registerInfoButtonProps: IButtonProps = stakeholder?.role === 'owner'
    ? !registerInfoComplete
      ? { ..._registerInfoButtonProps, icon: 'warning-sign', rightIcon: 'edit' }
      : { ..._registerInfoButtonProps, icon: 'info-sign', rightIcon: 'edit' }
    : { ..._registerInfoButtonProps, icon: 'info-sign' };

  const registerInfoButtonTooltip: string = stakeholder?.role === 'owner'
    ? !registerInfoComplete
      ? "Complete register information"
      : "Edit register information"
    : "View register information";

  return (
    <Navbar css={css`background: ${Colors.LIGHT_GRAY4}`}>
      <Navbar.Group>
        <NavbarHeading>
          <Tooltip content={registerInfoButtonTooltip}>
            <Button {...registerInfoButtonProps}>
              {register.name || '(unnamed register)'}
            </Button>
          </Tooltip>
        </NavbarHeading>
        {subregisters
          ? <ControlGroup>
              <Button disabled>Subregister</Button>
              <HTMLSelect
                value={selectedSubregisterID || NO_SELECTED_SUBREGISTER_OPTION}
                disabled={!onSelectSubregister || enteredCR !== false || registerInfoOpen}
                onChange={onSelectSubregister
                  ? evt => {
                      const val = evt.currentTarget.value;
                      if (val === NO_SELECTED_SUBREGISTER_OPTION) {
                        onSelectSubregister!(undefined);
                      } else {
                        onSelectSubregister!(val);
                      }
                    }
                  : undefined
                }
                options={[
                  { label: '—', value: NO_SELECTED_SUBREGISTER_OPTION },
                  ...Object.entries(subregisters).map(([subregID, { title }]) =>
                    ({ label: title, value: subregID })
                  )
                ]}
              />
            </ControlGroup>
          : null}
      </Navbar.Group>

      <Navbar.Group align="right">
        <CRSelector
          selectedCRID={selectedCRID}
          onSelectCR={onSelectCR}
          entered={enteredCR}
          onEnterCR={onEnterCR}
          onExitCR={onExitCR}
        />
      </Navbar.Group>
    </Navbar>
  );
};


const CRSelector: React.FC<{
  entered: boolean
  selectedCRID?: string
  onEnterCR?: () => void
  onExitCR?: () => void
  onSelectCR?: (crID: string | undefined) => void
}> = function ({ selectedCRID, entered, onEnterCR, onExitCR, onSelectCR }) {

  const { changeObjects, useObjectData, useObjectPaths } = useContext(DatasetContext);

  const crObjectPaths = useObjectPaths({ pathPrefix: 'change-requests' }).value;

  const dataRequest = crObjectPaths.map(objectPath => ({
    [objectPath]: 'utf-8' as 'utf-8'
  })).reduce((prev, curr) => ({ ...prev, ...curr }), {});

  const crs: ChangeRequest[] = Object.values(useObjectData(dataRequest).value).
  filter(val => val !== null).
  map(val => {
    const cr: ChangeRequest = yaml.load(val!.value as string | undefined || '{}');
    return cr;
  }).
  filter(cr => cr.timeDisposed === undefined);

  const changeRequestOptions: IOptionProps[] = [
    CHANGE_REQUEST_OPTIONS.new,
    ...crs.map(cr => ({
      value: cr.id,
      label: `${(cr.justification || cr.id).substring(0, 40)}…`,
    })),
  ];

  const creatingNew = selectedCRID === CHANGE_REQUEST_OPTIONS.new.value;
  const canCreate = changeObjects !== undefined;

  return (
    <ControlGroup>
      <HTMLSelect
        disabled={!onSelectCR || entered}
        options={changeRequestOptions}
        value={selectedCRID}
        onChange={(evt) => onSelectCR ? onSelectCR(evt.currentTarget.value) : void 0}
      />
      <Button
          active={entered}
          disabled={entered || !onEnterCR || !canCreate && creatingNew}
          onClick={() => onEnterCR ? onEnterCR() : void 0}>
        Go
      </Button>
      <Button
          disabled={!onExitCR || !entered}
          onClick={() => onExitCR ? onExitCR() : void 0}>
        Exit
      </Button>
    </ControlGroup>
  );
};
