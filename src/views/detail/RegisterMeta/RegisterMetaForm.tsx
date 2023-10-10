/** @jsx jsx */
/** @jsxFrag React.Fragment */

import update, { type Spec } from 'immutability-helper';
import React from 'react';
import { jsx, css } from '@emotion/react';
import styled from '@emotion/styled';
import {
  FormGroupProps,
  FormGroup as BaseFormGroup,
  Classes,
  Colors,
  ControlGroup,
  InputGroup,
  TextArea,
  HTMLTable,
  HTMLSelect,
  Button,
  ButtonGroup,
} from '@blueprintjs/core';
import { DatePicker, TimePrecision } from '@blueprintjs/datetime';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import type { Register, RegisterStakeholder, Locale } from '../../../types';
import { isStakeholderRole } from '../../../types';
import { STAKEHOLDER_ROLES, StakeholderRole } from '../../../types/stakeholder';



const DUMMY_VERSION: Register["version"] = {
  id: '',
  timestamp: new Date(),
};

const DUMMY_CONTACT: Register["stakeholders"][number]["parties"][number]["contacts"][number] = {
  label: 'email',
  value: ''
}
const DUMMY_PARTY: Register["stakeholders"][number]["parties"][number] = {
  name: '',
  contacts: [DUMMY_CONTACT],
};
const DUMMY_STAKEHOLDER: Register["stakeholders"][number] = {
  role: StakeholderRole.Submitter,
  name: '',
  gitServerUsername: undefined,
  parties: [DUMMY_PARTY],
};


const RegisterMetaForm: React.FC<{
  value: Register;
  onChange?: (newMeta: Register) => void;
  className?: string;
}> = function ({ value, onChange, className }) {

  function handleOperatingLanguageChange(fieldName: keyof Omit<Locale, 'characterEncoding'>) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      const newValue = update(value, { operatingLanguage: op => update(op ?? {}, { [fieldName]: { $set: evt.currentTarget.value } }) });
      onChange!(newValue);
    }
  }

  function makeFormEventHandler
  <T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement = HTMLInputElement>
  (func: (val: string) => Spec<typeof value>) {
    return (evt: React.FormEvent<T>) => {
      const spec = func(evt.currentTarget.value);
      if (spec) {
        onChange!(update(value, spec));
      }
    };
  }

  const stakeholders = value.stakeholders ?? [];
  function makeStakeholderChangeHandler<T extends HTMLInputElement | HTMLSelectElement>(
    idx: number,
    func: (val: string) => Spec<typeof value["stakeholders"][number]>,
  ) {
    return makeFormEventHandler<T>(val => ({ stakeholders: { [idx]: func(val) } }));
  }
  function handleStakeholderAdd() {
    onChange!({ ...value, stakeholders: [ ...stakeholders, DUMMY_STAKEHOLDER ] });
  }
  return (
    <div css={css`display: flex; flex-flow: row wrap; align-content: flex-start; align-items: flex-start; gap: 10px;`} className={className}>

      <SuperFormGroup label="Basics:">
        <FormGroup label="Name:">
          <InputGroup
            fill
            value={value.name || ''}
            readOnly={!onChange}
            onChange={makeFormEventHandler(val => ({ name: { $set: val } }))}
          />
        </FormGroup>

        <FormGroup label="Uniform resource identifier:">
          <InputGroup
            fill
            type="url"
            value={value.uniformResourceIdentifier || ''}
            readOnly={!onChange}
            onChange={makeFormEventHandler(val => ({ uniformResourceIdentifier: { $set: val } }))}
          />
        </FormGroup>

        <FormGroup label="Content summary:">
          <TextArea
            fill
            value={value.contentSummary || ''}
            readOnly={!onChange}
            onChange={makeFormEventHandler<HTMLTextAreaElement>(val => ({ contentSummary: { $set: val } }))}
          />
        </FormGroup>

        <FormGroup label="Operating language (locale):" helperText="Name, country and ISO 639-2 language code.">
          <ControlGroup vertical>
            <InputGroup
              readOnly={!onChange}
              placeholder="E.g., Welsh"
              value={value.operatingLanguage?.name ?? ''}
              onChange={handleOperatingLanguageChange('name')} />
            <InputGroup
              readOnly={!onChange}
              placeholder="3-character numerical country code from ISO 3166-1"
              value={value.operatingLanguage?.country ?? ''}
              onChange={handleOperatingLanguageChange('country')} />
            <InputGroup
              readOnly={!onChange}
              placeholder="3-character language code from ISO 639-2"
              value={value.operatingLanguage?.languageCode ?? ''}
              onChange={handleOperatingLanguageChange('languageCode')} />
          </ControlGroup>
        </FormGroup>
      </SuperFormGroup>

      <SuperFormGroup label="Version: " css={css`padding-bottom: 0;`}>
        <FormGroup label="Identifier: ">
          <InputGroup
            value={value.version?.id ?? ''}
            readOnly={!onChange}
            placeholder="E.g., 1.2"
            onChange={makeFormEventHandler(val =>
              ({ version: v => update(v ?? DUMMY_VERSION, { id: { $set: val } }) })
            )}
          />
        </FormGroup>
        <FormGroup
            label="Published on: "
            helperText={
              <>
                Date and time are
                <br />
                in {Intl.DateTimeFormat().resolvedOptions().timeZone}.
                {" "}
                <HelpTooltip content={<>
                  Times are in your computer’s current time zone.
                  {onChange
                    ? " When specifying, make sure to offset accordingly if it is different than register publication time zone."
                    : null}
                </>} />
              </>}>
          <DatePicker
            css={css`margin: 0 -${PADDING_PX - 1}px;`}
            timePrecision={TimePrecision.MINUTE}
            value={value.version?.timestamp ?? null}
            showActionsBar={onChange ? true : false}
            onChange={(val: Date | null) =>
              onChange!(update(value, val !== null
                ? { version: v => update(v ?? DUMMY_VERSION, { timestamp: { $set: val } }) }
                : { $unset: ['version'] }))
            }
          />
        </FormGroup>
      </SuperFormGroup>

      <SuperFormGroup
          label="Stakeholders:"
          helperText={onChange
            ? <Button onClick={handleStakeholderAdd} icon="add">Add</Button>
            : null}>
        {stakeholders.length > 0
          ? <HTMLTable css={css`margin: 0 -${PADDING_PX}px;`}>
              <thead>
                <tr css={css`& > * { white-space: nowrap }`}>
                  <th>Role</th>
                  <th>Name</th>
                  <th>Git server username</th>
                  <th>Parties</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {[ ...stakeholders.entries() ].map(([idx, s]) =>
                  <tr key={idx}>
                    <td>
                      <HTMLSelect
                        options={STAKEHOLDER_ROLES.map(r => ({ value: r, label: r }))}
                        disabled={!onChange}
                        onChange={makeStakeholderChangeHandler<HTMLSelectElement>(idx, (val) =>
                          isStakeholderRole(val)
                            ? { role: { $set: val } } as Spec<RegisterStakeholder> // Why do we need to cast this
                            : {}
                        )}
                        value={s.role} />
                    </td>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        onChange={makeStakeholderChangeHandler(idx, (val) =>
                          ({ name: { $set: val } })
                        )}
                        value={s.name} />
                    </td>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        onChange={makeStakeholderChangeHandler(idx, (val) =>
                          ({ gitServerUsername: { $set: val || undefined } })
                        )}
                        value={s.gitServerUsername || ''} />
                    </td>
                    <td>
                      <ControlGroup vertical={s.parties.length > 1}>
                        {s.parties.map((party, partyIdx) =>
                          <ButtonGroup key={partyIdx}>
                            <Button
                                key="delete"
                                outlined
                                disabled={!onChange || s.parties.length < 2 || party.name !== ''}
                                title="Delete this party"
                                onClick={() => onChange!(update(value, { stakeholders: { [idx]: { parties: { $splice: [[ partyIdx, 1 ]] } } } }))}
                                icon="cross"
                              />
                            {partyIdx === s.parties.length - 1
                              ? <Button
                                  key="add"
                                  outlined
                                  disabled={!onChange}
                                  onClick={() => onChange!(update(value, { stakeholders: { [idx]: { parties: { $push: [DUMMY_PARTY] } } } }))}
                                  title="Append a party"
                                  icon="plus"
                                />
                              : null}
                          </ButtonGroup>
                        )}
                      </ControlGroup>
                    </td>
                    <td>
                      <ControlGroup vertical={s.parties.length > 1}>
                        {s.parties.map((party, partyIdx) =>
                          <InputGroup
                            key={partyIdx}
                            readOnly={!onChange}
                            placeholder="Individual or organization"
                            onChange={makeStakeholderChangeHandler(idx, (val) =>
                              ({ parties: { [partyIdx]: { name: { $set: val } } } })
                            )}
                            value={(party as { name: string }).name}
                          />
                        )}
                      </ControlGroup>
                    </td>
                    <td>
                      <ControlGroup vertical={s.parties.length > 1}>
                        {s.parties.map((party, partyIdx) =>
                          <InputGroup
                            key={partyIdx}
                            type="email"
                            placeholder="Contact email"
                            readOnly={!onChange}
                            onChange={makeStakeholderChangeHandler(idx, (val) =>
                              ({ parties: { [partyIdx]: { contacts: { 0: { value: { $set: val } } } } } })
                            )}
                            value={party.contacts[0].value || ''} />
                        )}
                      </ControlGroup>
                    </td>
                  </tr>)}
              </tbody>
            </HTMLTable>
          : null}
      </SuperFormGroup>
    </div>
  );
};


const PADDING_PX = 11;
const FormGroup = styled(BaseFormGroup)`
  margin: 0;
`;
const SuperFormGroup_ = styled(FormGroup)`
  border-radius: 5px;
  padding: ${PADDING_PX}px;

  > label.bp4-label {
    font-weight: bold;
    margin-bottom: ${PADDING_PX}px;
  }
  > .bp4-form-content {
    display: flex;
    flex-flow: column nowrap;
    gap: ${PADDING_PX}px;
  }

  /* Note: these colors are picked to work with date input widget specifically. */
  background: ${Colors.WHITE};
  .bp4-dark & { background: ${Colors.DARK_GRAY3}; }
`;

const SuperFormGroup: React.FC<FormGroupProps> = function (props) {
  return <SuperFormGroup_ {...props} className={Classes.ELEVATION_3} />
}


export default RegisterMetaForm;
