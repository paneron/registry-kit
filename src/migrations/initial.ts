import type { DatasetMigrationFunction } from '@riboseinc/paneron-extension-kit/types/migrations';
import { REGISTER_METADATA_FILENAME } from '../common';


const enc = new TextEncoder();

const metadata = enc.encode(`
name: ISO/IEC ICS Codes
stakeholders:
  - role: owner
    name: "<owner entity name here>"
    gitServerUsername: "<VCS username here>"
    parties:
      - name: "<owner entity party name here>"
        contacts:
          - label: email
            value: "<owner entity party contact email here>"
version:
  id: "1"
  timestamp: "${(new Date()).toISOString()}",
contentSummary: Catalogue of codes in the International Classification for Standards.
`);



const initializeDataset: DatasetMigrationFunction = async (opts) => {
  return {
    versionAfter: '1.0.0',
    bufferChangeset: {
      [REGISTER_METADATA_FILENAME]: {
        newValue: metadata,
      },
    },
  };
};

export default initializeDataset;
