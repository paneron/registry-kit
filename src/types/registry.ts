export interface Registry {
  /** A registry is referenced by an UUID. */
  id: string

  name: string

  /** HTTPS URL to Git repository holding registry source information. */
  repoURL: string

  /** URL under which the registry is made publicly available. */
  publicURL: string

  /** Data directory within the repository. */
  dataRoot?: string
}

// TODO: What is below for?

export const KNOWN_AUTHORITATIVE_REGISTRIES: Registry[] = [
  {
    id: '9D546C5C-8FA4-496D-A721-6DA72E35F4A9',
    name: 'ICS codes',
    publicURL: 'https://ics.demo.paneron.org/',
    repoURL: 'https://github.com/paneron/ics-codes-registry',
  },
];

export interface ConnectedRegistry {
  workingCopyPath: string
}
