/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useContext, useEffect, useMemo, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import { Button, RadioGroup, Radio, FormGroup, TextArea, TextAreaProps, Intent } from '@blueprintjs/core';
import { Tooltip2 as Tooltip } from '@blueprintjs/popover2';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import type { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import { BrowserCtx } from '../../BrowserCtx';
import type { RegisterItem, RegisterStakeholder, Supersession } from '../../../types';
import { itemPathInCR, crIDToCRPath } from '../../itemPathUtils';
import * as CR from '../../../types/cr';
import { proposalsToObjectChangeset } from '../../change-request/objectChangeset';


// XXX: simplify
//type TransitionInputWidget<TO extends BaseCR, FROM extends BaseCR> =
//  TO["state"] extends keyof Transitions
//    ? FROM["state"] extends keyof Transitions[TO["state"]]
//      ? Transitions[TO["state"]][FROM["state"]] extends Transition<any, any, infer P>
//        ? React.FC<{
//            inputData: P;
//            onConfirm: (inputData: P) => Promise<void>;
//          }>
//        : never
//      : never
//    : never

// type TransitionInputWidget<P extends Record<string, any> | undefined> =
//   React.FC<{
//     //inputData: P;
//     onConfirm: (inputData: P) => Promise<void>;
//   }>
// 
// 
// type TransitionWidgetConfiguration<T> =
//   T extends Transition<infer C, infer C2, infer P>
//     ? {
//         title: JSX.Element | string
//         hint?: JSX.Element | string
//         Widget: TransitionInputWidget<P>;
//         stakeholderCanTransition: (stakeholder: RegisterStakeholder, cr: C) => boolean;
//         typeGuard: (c: BaseCR) => c is C;
//         targetState: C2["state"];
//       }
//     : never
// 
// //const SubmitterInput: TransitionInputWidget<SubmitterInput> = function ({ inputData, onConfirm }) {
// //  return <></>;
// //}
// 
// const ProposalInput: TransitionInputWidget<SubmitterInput> = function ({ onConfirm }) {
//   return <></>;
// };
// 
// const DraftInput: TransitionInputWidget<SubmitterInput> = function ({ onConfirm }) {
//   return <></>;
// };
// 
// const SubmitToControlBodyInput: TransitionInputWidget<RegisterManagerInput> = function ({ onConfirm }) {
//   return <></>;
// };
// 
// //type C = Transitions[typeof State.DRAFT][typeof State.PROPOSED]
// 
// const propose: TransitionWidgetConfiguration<Transitions[typeof State.DRAFT][typeof State.PROPOSED]> = {
//   Widget: ProposalInput,
//   title: "Propose",
//   stakeholderCanTransition: isSubmitter,
//   typeGuard: isDrafted,
//   targetState: State.PROPOSED,
// };
// const updateDraft: TransitionWidgetConfiguration<Transitions[typeof State.DRAFT][typeof State.DRAFT]> = {
//   Widget: DraftInput,
//   title: "Update draft",
//   stakeholderCanTransition: isSubmitter,
//   typeGuard: isDrafted,
//   targetState: State.DRAFT,
// };
// const submitToControlBody: TransitionWidgetConfiguration<Transitions[typeof State.PROPOSED][typeof State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]> = {
//   Widget: SubmitToControlBodyInput,
//   title: "Update draft",
//   stakeholderCanTransition: isSubmitter,
//   typeGuard: isProposed,
//   targetState: State.SUBMITTED_FOR_CONTROL_BODY_REVIEW,
// };
// 
// const options = [updateDraft, propose, submitToControlBody];
// 
// const RegisterManagerInput: TransitionInputWidget<RegisterManagerInput> = function ({ onConfirm }) {
//   return (
//     <FormGroup label="Content summary:">
//       <TextArea
//         fill
//         value={value.contentSummary || ''} readOnly={!onChange}
//         onChange={handleSummaryChange} />
//     </FormGroup>
//   );
// }
//type TransitionWidgetsConfiguration = {
//  [Statuses in `${keyof Transitions}_${keyof Transitions}`]:
//    Statuses extends `${infer F}_${infer T}`
//      ? F extends keyof Transitions
//        ? T extends keyof Transitions[F]
//          ? TransitionWidgetConfiguration<Transitions[F][T]>
//          : never
//        : never
//      : never
//}

interface State {
  chosenNextState?: CR.StateType;

  /**
   * Can contain any fields. Upon transition,
   * they will be validated against selected `chosenNextState`.
   */
  stateInput: Partial<CR.StateInput>;
}

type Action =
  | { type: 'unset-next-state' }
  | { type: 'choose-next-state'; payload: { state: CR.StateType } }
  | { type: 'update-next-state-input'; payload: Record<string, any> }

//export const TransitionOptions: C extends CR.Base ? C["state"] extends keyof CR.Transitions ? React.FC<{ cr: CR.Base }> : never : never = function ({ cr }) {
export const TransitionOptions: React.FC<{ cr: CR.Base, className?: string }> =
function ({ cr, className }) {
  const { stakeholder, subregisters } = useContext(BrowserCtx);
  const {
    getObjectData,
    updateObjects,
    performOperation,
    operationKey,
    usePersistentDatasetStateReducer,
  } = useContext(DatasetContext);

  const isBusy = operationKey !== undefined;

  const transitions = useMemo((
    () => stakeholder
      ? getTransitions(cr, stakeholder)
      : []
  ), [JSON.stringify(stakeholder), JSON.stringify(cr)]);

  const initialState: State = {
    // Pre-select next state to first available transition
    chosenNextState: transitions.length > 0
      ? transitions[0][0]
      : undefined,
    stateInput: {},
  };

  const [ state, dispatch, stateRecalled ] =
  (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)(
    `${cr.id}-${cr.state}`,
    undefined,
    undefined,
    (prevState, action) => {
      switch (action.type) {
        case 'unset-next-state':
          return {
            ...prevState,
            chosenNextState: undefined,
          };
        case 'choose-next-state':
          return {
            ...prevState,
            chosenNextState: action.payload.state,
          };
        case 'update-next-state-input':
          return {
            ...prevState,
            stateInput: action.payload,
          };
        default:
          throw new Error("Unexpected state");
      }
    },
    initialState,
    null);

  const selectedTransitionCfg = (stateRecalled && state.chosenNextState
    ? transitions.find(([t, ]) => t === state.chosenNextState)?.[1]
    : undefined
  ) ?? undefined;

  useEffect(() => {
    if (stateRecalled && state.chosenNextState) {
      if (!selectedTransitionCfg) {
        dispatch({ type: 'unset-next-state' });
      }
    }
  }, [
    stateRecalled,
    state.chosenNextState,
    JSON.stringify(selectedTransitionCfg),
  ]);

  const [validatedStateInput, stateInputValidationErrors]:
  [CR.StateInput, undefined] | [undefined, string] =
  useMemo(() => {
    if (cr && selectedTransitionCfg) {
      try {
        selectedTransitionCfg.func(cr, state.stateInput);
      } catch (e) {
        return [undefined, (e as any).message ?? `${e}`];
      }
      return [state.stateInput as CR.StateInput, undefined];
    } else {
      return [undefined, "no CR or no transition selected"];
    }
  }, [JSON.stringify(cr), JSON.stringify(selectedTransitionCfg), JSON.stringify(state.stateInput)]);

  const getItemChangesetAsApproved = useCallback(
  async function (cr: CR.Accepted | CR.AcceptedOnAppeal): Promise<ObjectChangeset> {
    const origItemData = (await getObjectData({
      objectPaths: [
        ...Object.entries(cr.items).
          filter(([, prop]) => prop.type !== 'addition').
          map(([itemPath, ]) => itemPath),
        ...Object.values(cr.items).
          filter(prop => prop.type === 'amendment' && prop.amendmentType === 'supersession').
          flatMap(prop => (prop as Supersession).supersedingItemIDs),
      ],
    })).data as Record<string, RegisterItem<any> | null>;
    //console.debug("Got orig item data", origItemData);
    const newItemData = (await getObjectData({
      objectPaths: Object.entries(cr.items).
        filter(([, prop]) => prop.type === 'clarification' || prop.type === 'addition').
        map(([itemPath, ]) => itemPathInCR(itemPath, cr.id)),
    })).data as Record<string, RegisterItem<any> | null>;
    //console.debug("Got new item data", newItemData);
    return await proposalsToObjectChangeset(
        cr.id,
        subregisters !== undefined,
        cr.items,
        origItemData,
        newItemData);
  }, [JSON.stringify(cr), JSON.stringify(subregisters)]);

  const handleTransition = useCallback(
  async function (transitionCfg: typeof selectedTransitionCfg, stateInput: CR.StateInput) {
    if (transitionCfg && updateObjects && stakeholder && transitionCfg.canBeTransitionedBy(stakeholder, cr)) {
      const newCR = {
        ...(transitionCfg.func(cr, stateInput) as Omit<CR.SomeCR, 'state'>),
        state: transitionCfg.targetState,
      };
      //console.debug("Transitioning CR", JSON.stringify(cr), JSON.stringify(newCR));
      const changeset: ObjectChangeset = {
        [crIDToCRPath(cr.id)]: {
          oldValue: cr,
          newValue: newCR,
        },
      };
      if (CR.isAccepted(newCR) || CR.isAcceptedOnAppeal(newCR)) {
        Object.assign(changeset, await getItemChangesetAsApproved(newCR));
      }
      await updateObjects({
        commitMessage: `${transitionCfg.title} CR`,
        objectChangeset: changeset,
      });
    } else {
      throw new Error("Either transition is not specified or dataset is read-only");
    }
  }, [updateObjects, JSON.stringify(stakeholder), JSON.stringify(cr)]);

  const canTransition = selectedTransitionCfg !== undefined && !isBusy && validatedStateInput !== undefined;

  return (
    <div css={css`display: flex; flex-flow: column nowrap;`} className={className}>
      {transitions.length > 0
        ? <RadioGroup
              selectedValue={state.chosenNextState}
              onChange={(evt) => CR.isState(evt.currentTarget.value)
                ? dispatch({
                    type: 'choose-next-state',
                    payload: { state: evt.currentTarget.value },
                  })
                : void 0}>
            {transitions.map(([state, cfg]) => 
              <Radio
                key={state}
                label={cfg.title}
                value={state}
                disabled={isBusy}
                large
              />
            )}
          </RadioGroup>
        : null}
      {selectedTransitionCfg?.Widget
        ? <Tooltip
              isOpen={stateInputValidationErrors !== undefined}
              placement='bottom'
              targetTagName='div'
              intent='warning'
              content={<>{stateInputValidationErrors}</>}>
            <selectedTransitionCfg.Widget
              value={Object.keys(state.stateInput).length > 0
                ? state.stateInput
                : cr}
              onChange={!isBusy
                ? (payload) => dispatch({
                    type: 'update-next-state-input',
                    payload,
                  })
                : undefined}
            />
          </Tooltip>
        : null}
      {selectedTransitionCfg
        ? <Button
              disabled={!canTransition}
              intent={canTransition ? 'primary' : undefined}
              onClick={() =>
                validatedStateInput
                  ? performOperation('transitioning CR state', handleTransition)
                    (selectedTransitionCfg, validatedStateInput)
                  : void 0
              }>
            {selectedTransitionCfg.title}
          </Button>
        : null}
    </div>
  );
};


export function getPastTransitions(cr: CR.Base): [key: string, el: JSX.Element][] {
  const els: [key: string, el: JSX.Element][] = [];
  if (CR.hasSubmitterInput(cr)) {
    els.push(['Submitter input', <>{cr.justification}</>]);
  }
  if (CR.hasRegisterManagerInput(cr)) {
    els.push(['Register manager notes', <>{cr.registerManagerNotes}</>]);
  }
  if (CR.hasControlBodyInput(cr)) {
    els.push(['Control body decision', <>{cr.controlBodyNotes}</>]);
  }
  if (CR.hasAppealRequest(cr)) {
    els.push(['Reason for appeal', <>{cr.appealReason}</>]);
  }
  if (CR.hasRegisterOwnerInput(cr)) {
    els.push(['Register owner notes', <>{cr.registerOwnerNotes}</>]);
  }
  return els;
}

//export const PastTransitions: React.FC<{ cr: CR.Base }> = function ({ cr }) {
//  const els: JSX.Element[] = [];
//  if (CR.hasSubmitterInput(cr)) {
//    els.push(<SubmitterInputWidget value={cr} />);
//  }
//  if (CR.hasRegisterManagerInput(cr)) {
//    els.push(<RegisterManagerNotesWidget value={cr} />);
//  }
//  if (CR.hasControlBodyInput(cr)) {
//    els.push(<ControlBodyNotesWidget value={cr} />);
//  }
//  if (CR.hasAppealRequest(cr)) {
//    els.push(<AppealRequestWidget value={cr} />);
//  }
//  if (CR.hasRegisterOwnerInput(cr)) {
//    els.push(<RegisterOwnerNotesWidget value={cr} />);
//  }
//  return <>{els}</>;
//}


type PossibleTransitionForCR<CR extends CR.Base> = [
  targetState: CR.StateType,
  cfg: CR.TransitionConfig<CR, CR.SomeCR, any>,
];

/**
 * Returns a list of transitions
 * that can be performed on given CR by given stakeholder.
 */
export function getTransitions<CR extends CR.Base>(
  cr: CR,
  stakeholder: RegisterStakeholder,
): PossibleTransitionForCR<CR>[] {
  const possibleTransitions = TRANSITIONS[cr.state as keyof CR.Transitions];
  if (possibleTransitions) {
    return (
      (Object.entries(possibleTransitions) as PossibleTransitionForCR<CR>[]).
      filter(([, t]) => t.canBeTransitionedBy(stakeholder, cr))
    );
  } else {
    return [];
  }
}


/**
 * Returns True if there is no possible transition for given state.
 */
export function isFinalState(state: CR.StateType): boolean {
  return (Object.keys(TRANSITIONS[state as keyof CR.Transitions] ?? {})).length < 1;
}


const applyRegisterManagerDecision: CR.Transition<
  CR.Proposed,
  CR.SubmittedForControlBodyReview
| CR.ReturnedForClarificationByManager,
  CR.RegisterManagerInput> =
function applyRegisterManagerDecision (cr, { registerManagerNotes }) {
  return {
    ...cr,
    registerManagerNotes: registerManagerNotes ?? '',
  };
}


const applyControlBodyDecision: CR.Transition<
  CR.SubmittedForControlBodyReview,
  CR.Accepted
| CR.Rejected
| CR.ReturnedForClarificationByControlBody,
  CR.ControlBodyInput> =
function applyControlBodyDecision (cr, { controlBodyNotes }) {
  if (!controlBodyNotes?.trim()) {
    throw new Error("Control body decision is required.");
  }
  return {
    ...cr,
    controlBodyNotes,
  };
}


const applyAppeal: CR.Transition<
  CR.Rejected,
  CR.Appealed,
  CR.AppealRequest> =
function applyAppeal (cr, { appealReason }) {
  if (!appealReason?.trim()) {
    throw new Error("Appeal reason is required.");
  }
  return {
    ...cr,
    appealReason,
    timeDisposed: undefined,
  };
}


const applyRegisterOwnerDecision: CR.Transition<
  CR.Appealed,
  CR.AcceptedOnAppeal
| CR.RejectionUpheld,
  CR.RegisterOwnerInput> =
function applyRegisterOwnerDecision (cr, { registerOwnerNotes }) {
  if (!registerOwnerNotes?.trim()) {
    throw new Error("Register owner note is required.");
  }
  return {
    ...cr,
    registerOwnerNotes,
    timeDisposed: new Date(),
  };
}


const WITHDRAWAL_TRANSITION:
CR.TransitionConfig<CR.Withdrawable, CR.Withdrawn, null> = {
  title: "Withdraw",
  targetState: CR.State.WITHDRAWN,
  Widget: null,
  canBeTransitionedBy: (stakeholder, cr) => cr.timeProposed && CR.isSubmittedBy(stakeholder, cr),
  func: (cr: CR.Withdrawable) => ({
    ...cr,
    timeDisposed: new Date(),
  }),
} as const;


const SubmitterInputWidget: React.FC<{
  value: CR.SubmitterInput
  onChange?: (newVal: CR.SubmitterInput) => void
}> = function ({ value, onChange }) {
  return (
    <FormGroup label="Justification:">
      <TransitionInputTextArea
        required
        value={value.justification}
        onChange={(evt) =>
          onChange?.({ justification: evt.currentTarget.value })
        }
      />
    </FormGroup>
  );
};


const TransitionInputTextArea: React.FC<TextAreaProps> = function (props) {
  return <TextArea
    fill
    css={css`resize: vertical;`}
    readOnly={!props.onChange}
    {...props}
  />;
};


const PROPOSAL_TRANSITION:
CR.TransitionConfig<CR.Proposable, CR.Proposed, CR.SubmitterInput> = {
  title: "Propose",
  targetState: CR.State.PROPOSED,
  canBeTransitionedBy: ((stakeholder, cr) =>
    CR.isSubmittedBy(stakeholder, cr) && Object.keys(cr.items).length > 0
  ),
  Widget: SubmitterInputWidget,
  func: (cr, submitterInput) => {
    if (!submitterInput?.justification?.trim()) {
      throw new Error("Justification is required.");
    }
    return {
      ...cr,
      ...submitterInput,
      timeProposed: new Date(),
    }
  },
}


const RegisterManagerNotesWidget: React.FC<{
  value: CR.RegisterManagerInput
  onChange?: (newVal: CR.RegisterManagerInput) => void
}> = function ({ value, onChange }) {
  return (
    <FormGroup label="Register manager notes:">
      <TransitionInputTextArea
        value={value.registerManagerNotes}
        required
        onChange={evt =>
          onChange?.({ registerManagerNotes: evt.currentTarget.value })
        }
      />
    </FormGroup>
  );
};


const ControlBodyNotesWidget: React.FC<{
  value: CR.ControlBodyInput
  onChange?: (newVal: CR.ControlBodyInput) => void
}> = function ({ value, onChange }) {
  return (
    <FormGroup label="Control body decision:">
      <TransitionInputTextArea
        value={value.controlBodyNotes}
        required
        onChange={evt =>
          onChange?.({
            controlBodyNotes: evt.currentTarget.value,
          })
        }
      />
    </FormGroup>
  );
};


const AppealRequestWidget: React.FC<{
  value: CR.AppealRequest
  onChange?: (newVal: CR.AppealRequest) => void
}> = function ({ value, onChange }) {
  return (
    <FormGroup label="Appeal reasoning:">
      <TransitionInputTextArea
        value={value.appealReason}
        required
        onChange={evt =>
          onChange?.({ appealReason: evt.currentTarget.value })
        }
      />
    </FormGroup>
  );
};


const RegisterOwnerNotesWidget: React.FC<{
  value: CR.RegisterOwnerInput
  onChange?: (newVal: CR.RegisterOwnerInput) => void
}> = function ({ value, onChange }) {
  return (
    <FormGroup label="Register owner notes:">
      <TransitionInputTextArea
        value={value.registerOwnerNotes}
        required
        onChange={evt =>
          onChange?.({ registerOwnerNotes: evt.currentTarget.value })
        }
      />
    </FormGroup>
  );
};


export const STATE_INTENT: { [key in CR.StateType]?: Intent } = {
  [CR.State.PROPOSED]: 'primary',
  [CR.State.RETURNED_FOR_CLARIFICATION]: 'primary',
  [CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: 'primary',
  [CR.State.APPEALED]: 'warning',
};



/** Associates transition implementation with source/target states. */
const TRANSITIONS: CR.Transitions = {
  [CR.State.DRAFT]: {
    [CR.State.WITHDRAWN]: WITHDRAWAL_TRANSITION,
    [CR.State.PROPOSED]: PROPOSAL_TRANSITION,
  },
  [CR.State.PROPOSED]: {
    [CR.State.WITHDRAWN]: WITHDRAWAL_TRANSITION,
    [CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: {
      title: "Submit for control body review",
      targetState: CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW,
      canBeTransitionedBy: (stakeholder) => ['owner', 'manager'].indexOf(stakeholder.role) >= 0,
      Widget: RegisterManagerNotesWidget,
      func: applyRegisterManagerDecision,
    },
    [CR.State.RETURNED_FOR_CLARIFICATION]: {
      title: "Return for clarification",
      targetState: CR.State.RETURNED_FOR_CLARIFICATION,
      canBeTransitionedBy: (stakeholder) => ['owner', 'manager'].indexOf(stakeholder.role) >= 0,
      Widget: RegisterManagerNotesWidget,
      func: function applyRegisterManagerReturnDecision(cr, payload) {
        if ((payload.registerManagerNotes ?? '').trim() === '') {
          throw new Error("Register manager notes are required if returning for clarification");
        }
        return applyRegisterManagerDecision(cr, payload);
      },
    },
  },
  [CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: {
    [CR.State.WITHDRAWN]: WITHDRAWAL_TRANSITION,
    [CR.State.RETURNED_FOR_CLARIFICATION]: {
      title: "Return for clarification",
      targetState: CR.State.RETURNED_FOR_CLARIFICATION,
      canBeTransitionedBy: (stakeholder) => ['owner', 'control-body'].indexOf(stakeholder.role) >= 0,
      Widget: ControlBodyNotesWidget,
      func: applyControlBodyDecision,
    },
    [CR.State.ACCEPTED]: {
      title: "Accept",
      targetState: CR.State.ACCEPTED,
      canBeTransitionedBy: (stakeholder) => ['owner', 'control-body'].indexOf(stakeholder.role) >= 0,
      Widget: ControlBodyNotesWidget,
      func: (cr, controlBodyInput) => ({
        ...applyControlBodyDecision(cr, controlBodyInput),
        timeDisposed: new Date(),
      }),
    },
    [CR.State.REJECTED]: {
      title: "Reject",
      targetState: CR.State.REJECTED,
      canBeTransitionedBy: (stakeholder) => ['owner', 'control-body'].indexOf(stakeholder.role) >= 0,
      Widget: ControlBodyNotesWidget,
      func: (cr, controlBodyInput) => ({
        ...applyControlBodyDecision(cr, controlBodyInput),
        timeDisposed: new Date(),
      }),
    },
  },
  [CR.State.RETURNED_FOR_CLARIFICATION]: {
    [CR.State.PROPOSED]: PROPOSAL_TRANSITION,
    [CR.State.WITHDRAWN]: WITHDRAWAL_TRANSITION,
  },
  [CR.State.REJECTED]: {
    [CR.State.APPEALED]: {
      title: "Appeal",
      targetState: CR.State.APPEALED,
      canBeTransitionedBy: CR.isSubmittedBy,
      Widget: AppealRequestWidget,
      func: applyAppeal,
    },
  },
  [CR.State.APPEALED]: {
    [CR.State.APPEAL_WITHDRAWN]: {
      title: "Withdraw appeal",
      targetState: CR.State.APPEAL_WITHDRAWN,
      canBeTransitionedBy: CR.isSubmittedBy,
      Widget: null,
      func: (cr) => ({
        ...cr,
        timeDisposed: new Date(),
      }),
    },
    [CR.State.ACCEPTED_ON_APPEAL]: {
      title: "Accept on appeal",
      targetState: CR.State.ACCEPTED_ON_APPEAL,
      canBeTransitionedBy: (stakeholder) => stakeholder.role === 'owner',
      Widget: RegisterOwnerNotesWidget,
      func: applyRegisterOwnerDecision,
    },
    [CR.State.REJECTION_UPHELD_ON_APPEAL]: {
      title: "Uphold rejection",
      targetState: CR.State.REJECTION_UPHELD_ON_APPEAL,
      canBeTransitionedBy: (stakeholder) => stakeholder.role === 'owner',
      Widget: RegisterOwnerNotesWidget,
      func: applyRegisterOwnerDecision,
    },
  },
} as const;
