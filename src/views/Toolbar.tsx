/** @jsx jsx */

import yaml from 'js-yaml';

import { css, jsx } from '@emotion/core';

import {
  Button, Colors, ControlGroup, IButtonProps, IOptionProps,
  Navbar, NavbarDivider, NavbarHeading,
  HTMLSelect
} from '@blueprintjs/core';

import { PluginFC } from '@riboseinc/paneron-extension-kit/types';
import { ChangeRequest, Register, RegisterStakeholder, RegistryViewProps } from '../types';
import { CHANGE_REQUEST_OPTIONS } from './ChangeRequest';


export const Toolbar: PluginFC<
  Pick<RegistryViewProps, 'useObjectData' | 'useObjectPaths'> & {
  title: string
  registerInfoOpen: boolean
  onOpenRegisterInfo?: (state: boolean) => void
  selectedCRID?: string
  onSelectCR?: (crID: string | undefined) => void
  register: Partial<Register>
  stakeholder: RegisterStakeholder | undefined
}> = function ({ React, register, stakeholder,
    useObjectData, useObjectPaths,
    selectedCRID, onSelectCR,
    registerInfoOpen, onOpenRegisterInfo }) {

  const registerInfoComplete = (
    register.id !== undefined &&
    register.name !== undefined &&
    register.contentSummary !== undefined &&
    register.uniformResourceIdentifier !== undefined &&
    register.operatingLanguage !== undefined &&
    register.alternativeLanguages !== undefined &&
    register.stakeholders !== undefined
  );

  const registerInfoButtonProps: Partial<IButtonProps> = {
    minimal: true,
    disabled: !onOpenRegisterInfo,
    active: registerInfoOpen,
    onClick: () => onOpenRegisterInfo ? onOpenRegisterInfo(!registerInfoOpen) : void 0,
  };

  return (
    <Navbar css={css`background: ${Colors.LIGHT_GRAY4}`}>
      <Navbar.Group>
        <NavbarHeading>
          {register.name || '(unnamed register)'}
        </NavbarHeading>

        <NavbarDivider />

        {!registerInfoComplete
          ? <Button icon="warning-sign" rightIcon="edit" intent="warning" {...registerInfoButtonProps}>
              Complete register information
            </Button>
          : stakeholder?.role === 'owner'
            ? <Button icon="info-sign" rightIcon="edit" {...registerInfoButtonProps}>
                Edit register information
              </Button>
            : <Button icon="info-sign" {...registerInfoButtonProps}>
                View register information
              </Button>}
      </Navbar.Group>

      {stakeholder
        ? <Navbar.Group align="right">
            <CRSelector
              React={React}
              selectedCRID={selectedCRID}
              onSelectCR={onSelectCR}
              useObjectData={useObjectData}
              useObjectPaths={useObjectPaths} />
          </Navbar.Group>
        : null}
    </Navbar>
  );
};


const CRSelector: PluginFC<
  Pick<RegistryViewProps, 'useObjectPaths' | 'useObjectData'> & {
  selectedCRID?: string
  onSelectCR?: (crID: string | undefined) => void
}> = function ({ React, selectedCRID, useObjectPaths, useObjectData, onSelectCR }) {
  const [_selectedCR, _selectCR] = React.useState<string>(CHANGE_REQUEST_OPTIONS.new.value as string);

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
          disabled={!onSelectCR}
          onClick={() => onSelectCR ? onSelectCR(_selectedCR) : void 0}>
        Open
      </Button>
      <Button
          disabled={!onSelectCR || selectedCRID === undefined}
          onClick={() => onSelectCR ? onSelectCR(undefined) : void 0}>
        Close
      </Button>
    </ControlGroup>
  );
};
