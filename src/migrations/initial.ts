import type { MigrationInfo } from '@riboseinc/paneron-extension-kit/types/migrations';
import { REGISTER_METADATA_FILENAME } from '../common';


const enc = new TextEncoder();

const metadata = enc.encode(`
name: Unnamed registry
stakeholders:
  - role: submitter
    name: owner entity name here...
    gitServerUsername: VCS username here...
    parties:
      - name: owner entity party name here...
        contacts:
          - label: email
            value: owner entity party contact email here...
version:
  id: '1'
  timestamp: ${(new Date()).toISOString()}
contentSummary: content summary goes here...
`);


const initialMigration: MigrationInfo = {
  versionAfter: '1.0.0',
  migrator: async function * initialRegistryMigration () {
    yield {
      [REGISTER_METADATA_FILENAME]: metadata,
    };
  },
};

export default initialMigration;
