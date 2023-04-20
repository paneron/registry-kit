import type { BufferDataset } from '@riboseinc/paneron-extension-kit/types/buffers';
import type { DatasetContext } from '@riboseinc/paneron-extension-kit/types/renderer';
import { REGISTER_METADATA_FILENAME } from '../common'; 
import getHTML from './page';


export default async function* exportPublicSite({ getObjectData, mapReduce }: {
  getObjectData: DatasetContext["getObjectData"],
  mapReduce: DatasetContext["getMapReducedData"],
  onProgress?: (message: string) => void,
}): AsyncGenerator<BufferDataset, void, void> {
  const registerMeta = (await getObjectData({
    objectPaths: [`/${REGISTER_METADATA_FILENAME}`],
  })).data[`/${REGISTER_METADATA_FILENAME}`];

  yield {
    '/hello.txt': Buffer.from('hello'),
    '/index.html': Buffer.from(getHTML({ title: "Register" })),
    '/register-meta.json': Buffer.from(JSON.stringify(registerMeta)),
  };
}
