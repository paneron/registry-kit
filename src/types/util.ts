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

  author?: string | null
  publisher?: string | null
  publicationDate?: string | null
  revisionDate?: string | null

  seriesIssueID: string | null
  seriesName: string | null
  seriesPage: string | null

  edition: string | null
  editionDate: string | null

  otherDetails: string

  isbn: string | null
  issn: string | null

  alternateTitles?: string[]

  doi?: string
  uri?: string

  //publicationDate: Date
}


export interface LocalizedAlternative<T> {
  alternative: T
  locale: Locale
}
