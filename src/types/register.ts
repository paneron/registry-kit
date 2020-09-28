import { RegisterStakeholder } from './stakeholder';
import { Locale } from './util';


export interface Register {
  id: string
  name: string
  contentSummary: string
  uniformResourceIdentifier: string

  operatingLanguage: Locale
  alternativeLanguages: Locale[]

  version?: Version
  stakeholders: RegisterStakeholder[]
}

interface Version {
  id: string
  timestamp: Date
}
