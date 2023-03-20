import protocolRegistry, { isValidProtocol } from '../protocolRegistry';

export async function getPlainTitle(uri: string): Promise<string> {
  const [proto, _path] = uri.split(':');
  if (isValidProtocol(proto)) {
    return await protocolRegistry[proto].plainTitle?.(_path) ?? 'N/A';
  } else {
    throw new Error("Invalid protocol");
  }
}
