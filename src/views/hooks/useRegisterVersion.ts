import { useContext } from 'react';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import { CR_BASE_QUERY } from '../../proposals/actionableGroups/queries';
import { State } from '../../types/cr';


export default function useRegisterVersion(): Date {
  const { useMapReducedData } = useContext(DatasetContext);

  const latestAcceptedProposalDisposedTimestamp = useMapReducedData({
    chains: {
      unnamedChain: {
      	predicateFunc: `
          const objPath = key, obj = value;
          return (${CR_BASE_QUERY} && ['${State.ACCEPTED}', '${State.ACCEPTED_ON_APPEAL}'].indexOf(obj.state) >= 0);
	`,
	mapFunc: `if (value?.timeDisposed) emit(new Date(value.timeDisposed));`,
	reduceFunc: `
	  if (!accumulator || value > accumulator) { return value; }
	  else { return accumulator; }
	`,
      },
    },
  });

  const result = latestAcceptedProposalDisposedTimestamp.value.unnamedChain as Date;
  console.debug('getting register version', result, latestAcceptedProposalDisposedTimestamp);
  if (result) {
    return result;
  } else {
    console.error("Invalid register version value", result);
    throw new Error("Failed to obtain register version (obtained value is not a timestamp)")
  }
}

