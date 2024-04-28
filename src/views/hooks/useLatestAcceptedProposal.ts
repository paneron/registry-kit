import { useContext } from 'react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { CR_BASE_QUERY } from '../../proposals/queries';
import {
  State,
  type Accepted, isAccepted,
  type AcceptedOnAppeal, isAcceptedOnAppeal,
} from '../../proposals/types';


export default function useLatestAcceptedProposal(): Accepted | AcceptedOnAppeal | null {
  const { useMapReducedData } = useContext(DatasetContext);

  const latestAcceptedProposalDisposedTimestamp = useMapReducedData({
    chains: {
      unnamedChain: {
      	predicateFunc: `
          const objPath = key, obj = value;
          return (${CR_BASE_QUERY} && obj.timeDisposed && ['${State.ACCEPTED}', '${State.ACCEPTED_ON_APPEAL}'].indexOf(obj.state) >= 0);
	`,
	mapFunc: `emit({ ...value, timeDisposed: new Date(value.timeDisposed) });`,
	reduceFunc: `
	  if (!accumulator.timeDisposed || value.timeDisposed > accumulator.timeDisposed) {
	    return value;
	  }
	  else { return accumulator; }
	`,
      },
    },
  });

  const result = latestAcceptedProposalDisposedTimestamp.value.unnamedChain;
  if (result) {
    if (isAccepted(result) || isAcceptedOnAppeal(result)) {
      return result;
    } else {
      throw new Error("Failed to obtain latest accepted proposal: invalid proposal shape")
    }
  } else {
    return null;
    //throw new Error("Failed to obtain latest accepted proposal: possibly none exist")
  }
}
