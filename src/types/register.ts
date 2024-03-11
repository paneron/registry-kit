import { type RegisterStakeholder, type Organization, isRegisterStakeholder } from './stakeholder';
import { type Locale } from './util';


export interface Register {
  // TODO: what is register ID? Perhaps URI is enough?
  id?: string
  name: string
  contentSummary: string
  uniformResourceIdentifier: string

  operatingLanguage: Locale
  alternativeLanguages: Locale[]

  version?: Version
  stakeholders: RegisterStakeholder[]

  organizations: {
    [orgID: string]: Organization
  }
}

export function isRegisterMetadata(val: any): val is Register {
  return (
    val &&
    // val.hasOwnProperty('id') &&
    //typeof val.id === 'string' &&
    val.hasOwnProperty('name') &&
    typeof val.name === 'string' &&
    //val.hasOwnProperty('contentSummary') &&
    //typeof val.contentSummary === 'string' &&
    val.hasOwnProperty('stakeholders') &&
    val.stakeholders.length > 0 &&
    // Stakeholders must be right
    val.stakeholders.every(isRegisterStakeholder) &&
    // Must have at least an owner? No
    // val.stakeholders.some((s: RegisterStakeholder) => s.role === 'owner') &&
    // Must have a valid version (or no version? hmm)
    (val.version === undefined || isVersion(val.version)));
}

export interface Version {
  id: string
  timestamp: Date
}

export function isVersion(val: any): val is Version {
  return (
    val &&
    val.hasOwnProperty('id') &&
    val.hasOwnProperty('timestamp') &&
    typeof val.id === 'string');
}
