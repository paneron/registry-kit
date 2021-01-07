interface RegistryLocation {
  id: string // UUID
  name: string
  repoURL: string
  dataRoot?: string
}

const KNOWN_AUTHORITATIVE_REGISTRIES: RegistryLocation[] = [
  {
    id: '9D546C5C-8FA4-496D-A721-6DA72E35F4A9',
    name: 'ICS codes',
    repoURL: 'https://github.com/paneron/ics-codes-registry',
  },
];

interface ConnectedRegistry {
  workingCopyPath: string
}
