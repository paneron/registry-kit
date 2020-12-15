/** @jsx jsx */
/** @jsxFrag React.Fragment */

import yaml from 'js-yaml';

import { useContext, useState } from 'react';

import { css, jsx } from '@emotion/core';

import {
  Button, Colors, ControlGroup, IButtonProps, IOptionProps,
  Navbar, NavbarHeading,
  HTMLSelect,
  Tooltip,
} from '@blueprintjs/core';

import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { ChangeRequest, Register, Subregisters } from '../types';
import { CHANGE_REQUEST_OPTIONS } from './ChangeRequest';


const NO_SELECTED_SUBREGISTER_OPTION = '—';


export const Toolbar: React.FC<{
  title: string
  register: Partial<Register>

  registerInfoOpen: boolean
  onOpenRegisterInfo?: (state: boolean) => void

  subregisters?: Subregisters<any>
  selectedSubregisterID?: string
  onSelectSubregister?: (subregID: string | undefined) => void

  selectedCRID?: string
  onSelectCR?: (crID: string | undefined) => void
}> = function ({
  register,
  registerInfoOpen,
  onOpenRegisterInfo,

  subregisters,
  selectedSubregisterID,
  onSelectSubregister,

  selectedCRID,
  onSelectCR,
}) {

  const { changeObjects } = useContext(DatasetContext);

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

  const registerInfoButtonProps: IButtonProps = changeObjects
    ? !registerInfoComplete
      ? { ..._registerInfoButtonProps, icon: 'warning-sign', rightIcon: 'edit' }
      : { ..._registerInfoButtonProps, icon: 'info-sign', rightIcon: 'edit' }
    : { ..._registerInfoButtonProps, icon: 'info-sign' };

  const registerInfoButtonTooltip: string = changeObjects
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
                disabled={!onSelectSubregister || selectedCRID !== undefined || registerInfoOpen}
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
          onSelectCR={onSelectCR} />
      </Navbar.Group>
    </Navbar>
  );
};


const CRSelector: React.FC<{
  selectedCRID?: string
  onSelectCR?: (crID: string | undefined) => void
}> = function ({ selectedCRID, onSelectCR }) {

  const { changeObjects, useObjectData, useObjectPaths } = useContext(DatasetContext);

  const [_selectedCR, _selectCR] = useState<string>(CHANGE_REQUEST_OPTIONS.new.value as string);

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

  const creatingNew = _selectedCR === CHANGE_REQUEST_OPTIONS.new.value;
  const canCreate = changeObjects !== undefined;

  return (
    <ControlGroup>
      <HTMLSelect
        disabled={!onSelectCR || selectedCRID !== undefined}
        options={changeRequestOptions}
        value={selectedCRID || _selectedCR}
        onChange={(evt) => _selectCR(evt.currentTarget.value)}
      />
      <Button
          active={selectedCRID !== undefined}
          disabled={!onSelectCR || !canCreate && creatingNew}
          onClick={() => onSelectCR ? onSelectCR(_selectedCR) : void 0}>
        {!creatingNew ? 'Open CR' : 'Create'}
      </Button>
      <Button
          disabled={!onSelectCR || selectedCRID === undefined}
          onClick={() => onSelectCR ? onSelectCR(undefined) : void 0}>
        Close
      </Button>
    </ControlGroup>
  );
};
