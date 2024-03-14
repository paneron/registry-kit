/** @jsx jsx */
/** @jsxFrag React.Fragment */

import update, { type Spec } from 'immutability-helper';
import React from 'react';
import { jsx, css } from '@emotion/react';
import {
  ControlGroup,
  InputGroup,
  FormGroup,
  TextArea,
  HTMLTable,
  HTMLSelect,
  Button,
  ButtonGroup,
  MenuItem,
} from '@blueprintjs/core';
import { MultiSelect2 as Select } from '@blueprintjs/select';
import { DatePicker, TimePrecision } from '@blueprintjs/datetime';
import HelpTooltip from '@riboseinc/paneron-extension-kit/widgets/HelpTooltip';
import { FormGroupAsCardInGrid } from '../../../views/util'; 
import type { Register, RegisterStakeholder, Locale } from '../../../types';
import {
  STAKEHOLDER_ROLES,
  type Contact,
  type Organization,
  type StakeholderOrgAffiliation,
  StakeholderRole,
  StakeholderRoleLabels,
  type StakeholderRoleType,
} from '../../../types/stakeholder';



const DUMMY_VERSION: Register["version"] = {
  id: '',
  timestamp: new Date(),
} as const;

const DUMMY_CONTACT: Contact = {
  label: 'email',
  value: 'example@example.com',
} as const;

const DUMMY_ORG: Organization = {
  name: 'New organization',
  logoURL: '',
} as const;
 
// const DUMMY_PARTY: Register["stakeholders"][number]["parties"][number] = {
//   name: '',
//   contacts: [DUMMY_CONTACT],
// };

const DUMMY_STAKEHOLDER: Register["stakeholders"][number] = {
  roles: [StakeholderRole.Submitter],
  name: 'New stakeholder',
  gitServerUsername: undefined,
  affiliations: {},
  contacts: [DUMMY_CONTACT] as Contact[],
  //parties: [DUMMY_PARTY],
} as const;


const RegisterMetaForm: React.FC<{
  value: Register;
  onChange?: (newMeta: Register) => void;
  className?: string;
}> = function ({ value, onChange, className }) {

  console.debug("Rendering RegisterMetaForm");

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

  const orgs = value.organizations ?? {};
  const organizationIDs = Object.keys(orgs);

  function makeStakeholderChangeHandler<T extends HTMLInputElement | HTMLSelectElement>(
    idx: number,
    func: (val: string) => Spec<typeof value["stakeholders"][number]>,
  ) {
    return makeFormEventHandler<T>(val => ({ stakeholders: { [idx]: func(val) } }));
  }

  function handleStakeholderAdd() {
    onChange!({ ...value, stakeholders: [ ...stakeholders, DUMMY_STAKEHOLDER ] });
  }
  function handleStakeholderDelete(idx: number) {
    onChange!(update(value, { stakeholders: { $splice: [[idx, 1]] } }));
  }

  function makeOrgChangeHandler<T extends HTMLInputElement | HTMLSelectElement>(
    orgID: string,
    func: (val: string) => Spec<typeof value["organizations"][string]>,
  ) {
    return makeFormEventHandler<T>(val => ({ organizations: { [orgID]: func(val) } }));
  }

  function handleOrgAdd() {
    const newID = crypto.randomUUID();
    onChange!({ ...value, organizations: { ...orgs, [newID]: DUMMY_ORG } });
  }
  function handleOrgDelete(orgID: string) {
    onChange!(update(value, { organizations: { $unset: [orgID] } }));
  }

  function findAffiliations(orgID: string): StakeholderOrgAffiliation[] {
    return stakeholders.
      filter(s => s.affiliations?.[orgID] !== undefined).
      flatMap(s => Object.values(s.affiliations ?? {}));
  }

  function findAffiliationOptions(s: RegisterStakeholder) {
    return Object.entries(orgs).
      filter(([orgID]) => s.affiliations?.[orgID] === undefined).
      map(([orgID, org]) => ({
        value: orgID,
        label: org.name,
      }));
  }

  return (
    <>

      <FormGroupAsCardInGrid label="Basics:" paddingPx={PADDING_PX}>
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
      </FormGroupAsCardInGrid>

      <FormGroupAsCardInGrid
          label="Version: "
          // Accommodation for date picker
          css={css`padding-bottom: 0;`}
          paddingPx={PADDING_PX}>
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
      </FormGroupAsCardInGrid>

      <FormGroupAsCardInGrid
          paddingPx={PADDING_PX}
          label="Organizations:"
          css={css`min-width: 100%`}
          helperText={onChange
            ? <Button onClick={handleOrgAdd} icon="add">Add</Button>
            : null}>
        {organizationIDs.length > 0
          ? <HTMLTable css={css`margin: 0 -${PADDING_PX}px;`}>
              <thead>
                <tr css={css`& > * { white-space: nowrap }`}>
                  <th>Name</th>
                  <th>Logo URL</th>
                </tr>
              </thead>
              <tbody>
                {[ ...Object.entries(value.organizations) ].map(([orgID, s]) =>
                  <tr key={orgID}>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        rightElement={
                          <Button
                            key="delete"
                            outlined
                            disabled={!onChange || findAffiliations(orgID).length > 0}
                            title="Delete this organization"
                            onClick={() => handleOrgDelete(orgID)}
                            icon="cross"
                            intent="warning"
                          />
                        }
                        onChange={makeOrgChangeHandler(orgID, (val) =>
                          ({ name: { $set: val } })
                        )}
                        value={s.name} />
                    </td>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        onChange={makeOrgChangeHandler(orgID, (val) =>
                          ({ logoURL: { $set: val } })
                        )}
                        value={s.logoURL} />
                    </td>
                  </tr>)}
              </tbody>
            </HTMLTable>
          : null}
      </FormGroupAsCardInGrid>

      <FormGroupAsCardInGrid
          paddingPx={PADDING_PX}
          label="Stakeholders:"
          css={css`min-width: 100%`}
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
                  <th>Affiliations</th>
                </tr>
              </thead>
              <tbody>
                {[ ...stakeholders.entries() ].map(([idx, s]) =>
                  <tr key={idx}>
                    <td>
                      <Select<StakeholderRoleType>
                        items={STAKEHOLDER_ROLES}
                        selectedItems={[...(s.roles ?? [(s as any).role as string])]}
                        disabled={!onChange || !s.roles}
                        itemDisabled={i => s.roles?.includes(i)}
                        tagRenderer={i => StakeholderRoleLabels[i]}
                        onRemove={i =>
                          onChange!(update(value, { stakeholders: { [idx]: { roles: { $splice: [[s.roles.indexOf(i), 1]] } } } }))
                        }
                        itemRenderer={(i, { handleClick, modifiers: { active, disabled } }) =>
                          <MenuItem
                            text={StakeholderRoleLabels[i]}
                            active={active}
                            disabled={disabled}
                            onClick={handleClick}
                          />
                        }
                        onItemSelect={item =>
                          onChange!(update(value, { stakeholders: { [idx]: { roles: { $push: [item] } } } }))
                        }
                      />
                    </td>
                    <td>
                      <InputGroup
                        readOnly={!onChange}
                        onChange={makeStakeholderChangeHandler(idx, (val) =>
                          ({ name: { $set: val } })
                        )}
                        rightElement={
                          <Button
                            key="delete"
                            outlined
                            disabled={!onChange}
                            title="Delete this stakeholder"
                            onClick={() => handleStakeholderDelete(idx)}
                            icon="cross"
                            intent="warning"
                          />
                        }
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
                      <ControlGroup vertical>
                        {Object.entries(s.affiliations ?? {}).
                            sort(([, aff], [, aff2]) => aff2.role.localeCompare(aff.role)).
                            map(([orgID, affiliation], _affiliationIdx) =>
                          <ButtonGroup key={orgID}>
                            <InputGroup
                              key="org"
                              readOnly
                              value={orgs[orgID]?.name ?? orgID}
                              rightElement={
                                <Button
                                  key="delete"
                                  outlined
                                  disabled={!onChange}
                                  title="Delete this affiliation"
                                  onClick={() => onChange!(update(value, { stakeholders: { [idx]: { affiliations: { $unset: [orgID] } } } }))}
                                  icon="cross"
                                />
                              }
                            />
                            <HTMLSelect
                              key="set-role"
                              disabled={!onChange}
                              value={affiliation.role}
                              options={[
                                { value: 'pointOfContact', label: 'point of contact' },
                                { value: 'member', label: 'member' },
                              ]}
                              onChange={(evt) => onChange!(update(value, { stakeholders: { [idx]: { affiliations: { [orgID]: { role: { $set: evt.currentTarget.value as 'pointOfContact' | 'member' } } } } } }))}
                              title="Specify role in organization"
                            />
                          </ButtonGroup>
                        )}
                        {findAffiliationOptions(s).length > 0 && onChange
                          ? <HTMLSelect
                              key="add"
                              options={[
                                { label: "Append affiliation…", value: '' },
                                ...findAffiliationOptions(s),
                              ]}
                              value=""
                              onChange={(evt) => evt.currentTarget.value?.trim() !== ''
                                ? onChange!(update(value, { stakeholders: { [idx]: { affiliations: { [evt.currentTarget.value]: { $set: { role: 'member' } } } } } }))
                                : void 0}
                              title="Append affiliation…"
                            />
                          : null}
                      </ControlGroup>
                    </td>
                  </tr>)}
              </tbody>
            </HTMLTable>
          : null}
      </FormGroupAsCardInGrid>
    </>
  );
};


const PADDING_PX = 11;


export default RegisterMetaForm;
