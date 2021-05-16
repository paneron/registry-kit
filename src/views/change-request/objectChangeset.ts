import { Change } from '@riboseinc/paneron-extension-kit/types/changes';
import { ObjectChangeset, ObjectDataset } from '@riboseinc/paneron-extension-kit/types/objects';
import { Addition, ChangeProposal, ChangeRequest, Clarification, RegisterItem, Retirement, Supersession } from '../../types';


export async function proposalsToObjectChangeset(
  proposals: ChangeRequest["proposals"],
  itemData: ObjectDataset,
  makeUUID: () => Promise<string>,
): Promise<ObjectChangeset> {
  const cs: ObjectChangeset = {};

  for (const [itemPath, proposal] of Object.entries(proposals)) {
    const originalItem = (itemData[itemPath] ?? null) as RegisterItem<any> | null;

    let proposalOpts: ApplyProposalOpts<any>;

    if (proposal.type === 'clarification' || proposal.type === 'amendment') {
      if (originalItem === null) {
        console.error("Unable to convert proposals to object changeset: original item data is missing", itemPath);
        throw new Error("Unable to convert proposals to object changeset: original item data is missing");
      }
      proposalOpts = {
        originalItem,
        makeUUID,
      };
    } else {
      proposalOpts = {
        originalItem: undefined,
        makeUUID,
      } as ApplyProposalOpts<Addition>;
    }

    const change: Change<RegisterItem<any>> = {
      oldValue: originalItem,
      newValue: await applyProposal(proposal, proposalOpts),
    };

    cs[itemPath] = change;
  }

  return cs;
}


interface ApplyProposalOpts<P extends ChangeProposal> {
  makeUUID: () => Promise<string>
  originalItem: P extends Clarification | Retirement | Supersession
    ? RegisterItem<any>
    : never
}


async function applyProposal<P extends ChangeProposal>
(proposal: P, opts: ApplyProposalOpts<P>): Promise<RegisterItem<any>> {
  let newItem: RegisterItem<any>;
  if (proposal.type !== 'addition') {
    newItem = { ...opts.originalItem };
  } else {
    const addition = proposal as Addition;
    newItem = {
      id: await opts.makeUUID(),
      data: addition.payload,
      status: 'valid',
      dateAccepted: new Date(),
    };
  }
  return newItem;
}
