// Utilities

export interface Locale {
  name: string
  country: string
  languageCode: string // ISO 639-2
  characterEncoding: 'utf-8' // TODO: Support more encodings
  // TODO: citation?: CI_Citation
}


export interface Citation {
  title: string
  alternateTitles: string[]
  publicationDate: Date
  otherCitationDetails: string
}
