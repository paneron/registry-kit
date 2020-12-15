/** @jsx jsx */

import { jsx, css } from '@emotion/core';
import update, { Spec } from 'immutability-helper';

import { useState } from 'react';

import { Button, ControlGroup, FormGroup, HTMLSelect, HTMLTable, InputGroup, TextArea } from '@blueprintjs/core';

import { Locale, Register, RegisterStakeholder, STAKEHOLDER_ROLES } from '../types';
import { MainView } from './MainView';


export const RegisterInformation: React.FC<{
  register: Partial<Register> | null
  onSave?: (value: Partial<Register>, oldValue: Partial<Register> | null) => void
}> = function ({ register, onSave }) {

  const [editedValue, setEditedValue] = useState<Partial<Register> | null>(null);

  const _r = editedValue || register;

  function handleSave() {
    if (!onSave) { return; }
    if (editedValue === null) { return; }
    onSave(editedValue, register);
  }

  const saveAction = onSave
    ? <Button intent="success" onClick={handleSave}>Save</Button>
    : undefined;

  return (
    <MainView actions={saveAction}>
      <RegisterForm value={_r || {}} onChange={onSave ? setEditedValue : undefined} />
    </MainView>
  );
};


const RegisterForm: React.FC<{
  value: Partial<Register>
  onChange?: (newValue: Partial<Register>) => void
}> = function ({ value, onChange }) {

  function handleNameChange(evt: React.FormEvent<HTMLInputElement>) {
    onChange!({ ...value, name: evt.currentTarget.value });
  }

  function handleURIChange(evt: React.FormEvent<HTMLInputElement>) {
    onChange!({ ...value, uniformResourceIdentifier: evt.currentTarget.value });
  }

  function handleOperatingLanguageChange(fieldName: keyof Omit<Locale, 'characterEncoding'>) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      const newValue = update(value, { operatingLanguage: { [fieldName]: { $set: evt.currentTarget.value }}});
      onChange!(newValue);
    }
  }

  function handleSummaryChange(evt: React.FormEvent<HTMLTextAreaElement>) {
    onChange!({ ...value, contentSummary: evt.currentTarget.value });
  }

  const stakeholders = value.stakeholders || [];

  function updateStakeholder(idx: number, spec: Spec<RegisterStakeholder>) {
    const newStakeholders = update(stakeholders, { [idx]: spec });
    onChange!({ ...value, stakeholders: newStakeholders });
  }
  function handleStakeholderRoleChange(idx: number ,) {
    return (evt: React.FormEvent<HTMLSelectElement>) => {
      updateStakeholder(idx, { role: { $set: evt.currentTarget.value as 'manager' | 'owner' | 'submitter' } } as Spec<RegisterStakeholder>);
    }
  }
  function handleStakeholderNameChange(idx: number) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      updateStakeholder(idx, { name: { $set: evt.currentTarget.value } });
    }
  }
  function handleStakeholderPartyNameChange(idx: number) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      updateStakeholder(idx, { parties: { 0: { name: { $set: evt.currentTarget.value } } } });
    }
  }
  function handleStakeholderGitUsernameChange(idx: number) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      updateStakeholder(idx, { gitServerUsername: { $set: evt.currentTarget.value || undefined } });
    }
  }
  function handleStakeholderEmailChange(idx: number) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      updateStakeholder(idx, { parties: { 0: { contacts: { 0: { value: { $set: evt.currentTarget.value } } } } } });
    }
  }
  function handleStakeholderAdd() {
    onChange!({ ...value, stakeholders: [ ...stakeholders, {
      role: 'submitter',
      name: '',
      gitServerUsername: undefined,
      parties: [ { name: '', contacts: [ { label: 'email', value: '' } ] } ],
    } ] });
  }

  return (
    <div css={css`flex: 1; padding: 1rem; display: flex; flex-flow: column nowrap; overflow-y: auto;`}>

      <FormGroup label="Name:">
        <InputGroup
          fill
          value={value.name || ''} readOnly={!onChange}
          onChange={handleNameChange} />
      </FormGroup>

      <FormGroup label="Uniform resource identifier:">
        <InputGroup
          fill
          type="url"
          value={value.uniformResourceIdentifier || ''} readOnly={!onChange}
          onChange={handleURIChange} />
      </FormGroup>

      <FormGroup label="Content summary:">
        <TextArea
          fill
          value={value.contentSummary || ''} readOnly={!onChange}
          onChange={handleSummaryChange} />
      </FormGroup>

      <FormGroup label="Operating language (locale):" helperText="Name, country and ISO 639-2 language code.">
        <ControlGroup fill>
          <InputGroup
            readOnly={!onChange}
            placeholder="E.g., Welsh"
            value={value.operatingLanguage?.name}
            onChange={handleOperatingLanguageChange('name')} />
          <InputGroup
            readOnly={!onChange}
            placeholder="3-character numerical country code from ISO 3166-1"
            value={value.operatingLanguage?.country}
            onChange={handleOperatingLanguageChange('country')} />
          <InputGroup
            readOnly={!onChange}
            placeholder="3-character language code from ISO 639-2"
            value={value.operatingLanguage?.languageCode}
            onChange={handleOperatingLanguageChange('languageCode')} />
        </ControlGroup>
      </FormGroup>

      <FormGroup
          label="Stakeholders:"
          helperText={onChange
            ? <Button small minimal onClick={handleStakeholderAdd} icon="add">Add</Button>
            : undefined}>
        {stakeholders.length > 0
          ? <HTMLTable>
              <thead>
                <tr css={css`& > * { white-space: nowrap }`}>
                  <th>Role</th>
                  <th>Name</th>
                  <th>Party (individual) name</th>
                  <th>Git server username</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {[ ...stakeholders.entries() ].map(([idx, s]) =>
                  <tr>
                    <td>
                      <HTMLSelect
                        options={STAKEHOLDER_ROLES.map(r => ({ value: r, label: r }))}
                        disabled={!onChange}
                        onChange={handleStakeholderRoleChange(idx)}
                        value={s.role} />
                    </td>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        onChange={handleStakeholderNameChange(idx)}
                        value={s.name} />
                    </td>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        onChange={handleStakeholderPartyNameChange(idx)}
                        value={(s.parties[0] as { name: string }).name} />
                    </td>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        onChange={handleStakeholderGitUsernameChange(idx)}
                        value={s.gitServerUsername || ''} />
                    </td>
                    <td>
                      <InputGroup
                        type="email"
                        readOnly={!onChange}
                        onChange={handleStakeholderEmailChange(idx)}
                        value={s.parties[0].contacts[0].value || ''} />
                    </td>
                  </tr>)}
              </tbody>
            </HTMLTable>
          : null}
      </FormGroup>

    </div>
  );
};
