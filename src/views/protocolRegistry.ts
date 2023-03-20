import { ProtocolRegistry } from '@riboseinc/paneron-extension-kit/widgets/TabbedWorkspace/types';
import RegisterItem from './detail/RegisterItem';
import RegisterMeta from './detail/RegisterMeta';
import ChangeRequest from './detail/ChangeRequest';
import CustomView from './detail/CustomView';

export const Protocols = {
  ITEM_DETAILS: 'itemdetails',
  REGISTER_META: 'registermeta',
  CHANGE_REQUEST: 'changerequest',
  CUSTOM_VIEW: 'customview',
} as const;

export type Protocol = typeof Protocols[keyof typeof Protocols];

export const protocols = Object.values(Protocols) as Protocol[];

export function isValidProtocol(val: string): val is Protocol {
  return protocols.indexOf(val as Protocol) >= 0;
}

// TODO: Implement proper registration pattern rather than registering
// these in a centralized manner.
const protocolRegistry: ProtocolRegistry<Protocol> = {
  [Protocols.ITEM_DETAILS]: RegisterItem,
  [Protocols.REGISTER_META]: RegisterMeta,
  [Protocols.CHANGE_REQUEST]: ChangeRequest,
  [Protocols.CUSTOM_VIEW]: CustomView,
};

export default protocolRegistry;
