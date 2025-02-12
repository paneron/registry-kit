/** @jsx jsx */
/** @jsxFrag React.Fragment */

import React, { useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { jsx, css } from '@emotion/react';
import { Button, RadioGroup, Radio, FormGroup, TextArea, type TextAreaProps, type Intent, Colors } from '@blueprintjs/core';
import { Tooltip2 as Tooltip } from '@blueprintjs/popover2';
import { DatasetContext } from '@riboseinc/paneron-extension-kit/context';
import type { PersistentStateReducerHook } from '@riboseinc/paneron-extension-kit/usePersistentStateReducer';
import type { ObjectChangeset } from '@riboseinc/paneron-extension-kit/types/objects';
import { BrowserCtx } from '../views/BrowserCtx';
import type { RegisterItem, RegisterStakeholder } from '../types';
import { isOwner, isControlBody, isManager } from '../types/stakeholder';
import { itemPathInCR, crIDToCRPath } from '../views/itemPathUtils';

import { proposalsToObjectChangeset } from './objectChangeset';
import type { Supersession } from './types';
import * as CR from './types';


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

function reducer(prevState: State, action: Action) {
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
}

export interface TransitionOptions<C extends CR.SomeCR> {
  cr: C
  transitions: PossibleTransitionForCR<C>[]
  stakeholder?: RegisterStakeholder
  className?: string
}

//export const TransitionOptions: C extends CR.Base ? C["state"] extends keyof CR.Transitions ? React.FC<{ cr: CR.Base }> : never : never = function ({ cr }) {
function TransitionOptions<C extends CR.SomeCR>
({ cr, transitions, stakeholder, className }: TransitionOptions<C>) {
  const { subregisters, alterApprovedCR } = useContext(BrowserCtx);
  const {
    getObjectData,
    getMapReducedData,
    updateObjects,
    performOperation,
    operationKey,
    usePersistentDatasetStateReducer,
  } = useContext(DatasetContext);

  const isBusy = operationKey !== undefined;

  const initialState: State = useMemo((() => ({
    // Pre-select next state to first available transition
    chosenNextState: transitions.length > 0
      ? transitions[0][0]
      : undefined,
    stateInput: {},
  })), [transitions]);

  // Set to a number of milliseconds to wait for, e.g. after selecting a new action,
  // to avoid accidental transitions.
  const [ waitingForCooldown, setWaitingForCooldown ] = useState(0);

  const [ state, dispatch, stateRecalled ] =
  (usePersistentDatasetStateReducer as PersistentStateReducerHook<State, Action>)(
    `${cr.id}-${cr.state}`,
    undefined,
    undefined,
    reducer,
    initialState,
    null);

  const selectedTransitionCfg = useMemo((() =>
    (
      stateRecalled && state.chosenNextState
        ? transitions.find(([t, ]) => t === state.chosenNextState)?.[1]
        : undefined
    ) ?? undefined
  ), [stateRecalled, state.chosenNextState, transitions]);

  useEffect((() => setWaitingForCooldown(2000)), [state.chosenNextState]);

  useEffect(() => {
    if (stateRecalled) {
      // Don’t pre-select the next state checkbox.
      // Persisting the state is still useful, since this remembers state input
      // (such as register manager notes)
      dispatch({ type: 'unset-next-state' });
    }
  }, [stateRecalled]);

  //useEffect(() => {
  //  if (stateRecalled && state.chosenNextState) {
  //    if (!selectedTransitionCfg) {
  //      dispatch({ type: 'unset-next-state' });
  //    }
  //  }
  //}, [
  //  stateRecalled,
  //  state.chosenNextState,
  //  selectedTransitionCfg,
  //]);

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
  }, [JSON.stringify(cr), selectedTransitionCfg, state.stateInput]);

  const handleSetStateInput = useCallback((payload: any) => {
    dispatch({
      type: 'update-next-state-input',
      payload,
    });
    setWaitingForCooldown(5000);
  }, [dispatch, setWaitingForCooldown]);

  useEffect(() => {
    if (waitingForCooldown) {
      const timeout = setTimeout(
        (() => setWaitingForCooldown(v => v > 0 ? (v - 100) : v)),
        100);
      return function cleanUp() { clearTimeout(timeout) };
    }
    return function noop() {};
  }, [waitingForCooldown, setWaitingForCooldown]);

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
    const maybeAlteredCR = alterApprovedCR
      ? await alterApprovedCR(
          cr.id,
          cr.items,
          origItemData,
          newItemData,
          { getMapReducedData })
      : { proposals: cr.items, origItemData, newItemData };
    //console.debug("Got altered item data", newItemData);
    return await proposalsToObjectChangeset(
      cr.id,
      subregisters !== undefined,
      maybeAlteredCR.proposals,
      maybeAlteredCR.origItemData,
      maybeAlteredCR.newItemData);
  }, [cr.id, JSON.stringify(cr.items), subregisters === undefined, getObjectData, getMapReducedData, alterApprovedCR]);

  const handleTransition = useCallback(
  async function (transitionCfg: typeof selectedTransitionCfg, stateInput: CR.StateInput) {
    if (transitionCfg && updateObjects && stakeholder && transitionCfg.canBeTransitionedBy(stakeholder, cr)) {
      const newCR = {
        ...(transitionCfg.func(cr, stateInput) as Omit<CR.SomeCR, 'state'>),
        state: transitionCfg.targetState,
      };
      newCR.pastTransitions = [
        ...(newCR.pastTransitions ?? []),
        {
          label: transitionCfg.title,
          timestamp: new Date(),
          fromState: cr.state,
          toState: newCR.state,
          stakeholder,
          input: stateInput,
        },
      ];
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

  const canTransition = (
    selectedTransitionCfg !== undefined
    && !isBusy
    && validatedStateInput !== undefined
    && !waitingForCooldown
  );

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
              css={css`flex: 1;`}
              content={<>{stateInputValidationErrors}</>}>
            <selectedTransitionCfg.Widget
              value={Object.keys(state.stateInput).length > 0
                ? state.stateInput
                : cr}
              onChange={!isBusy
                ? handleSetStateInput
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
                  ? performOperation('transitioning CR state', handleTransition)(
                      selectedTransitionCfg,
                      validatedStateInput,
                    )
                  : void 0
              }>
            {waitingForCooldown
              ? <>Almost ready{Array(Math.floor(3 - (3 / 5000 * waitingForCooldown) + 1)).fill(undefined).map(() => <>.</>)}</>
              : selectedTransitionCfg.title}
          </Button>
        : null}
    </div>
  );
};


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
 * Returns true if given CR can be transitioned
 * *and* given stakeholder is eligible to transition it.
 */
export function canBeTransitionedBy(stakeholder: RegisterStakeholder, cr: CR.SomeCR) {
  return getTransitions(cr, stakeholder).length > 0;
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
function applyControlBodyDecision (cr, { controlBodyNotes, controlBodyDecisionEvent }) {
  if (!controlBodyNotes?.trim()) {
    throw new Error("Control body decision is required.");
  }
  return {
    ...cr,
    controlBodyNotes,
    controlBodyDecisionEvent,
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


const ControlBodyDecisionWidget: React.FC<{
  value: CR.ControlBodyInput
  onChange?: (newVal: CR.ControlBodyInput) => void
}> = function ({ value, onChange }) {
  return (
    <>
      {/*
      <ControlBodyNotesWidget
        value={value}
        onChange={onChange}
      />*/}
      <FormGroup label="Control Body decision event:">
        <TransitionInputTextArea
          value={value.controlBodyDecisionEvent}
          required
          onChange={evt =>
            onChange?.({
              controlBodyNotes: value.controlBodyNotes,
              controlBodyDecisionEvent: evt.currentTarget.value,
            })
          }
        />
      </FormGroup>
    </>
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


export const STATE_COLOR: { [key in CR.StateType]?: typeof Colors[keyof typeof Colors] } = {
  [CR.State.PROPOSED]: Colors.BLUE2,
  [CR.State.RETURNED_FOR_CLARIFICATION]: Colors.ORANGE3,
  [CR.State.SUBMITTED_FOR_CONTROL_BODY_REVIEW]: Colors.BLUE2,

  [CR.State.APPEALED]: Colors.ORANGE3,
  [CR.State.REJECTED]: Colors.RED2,
  [CR.State.REJECTION_UPHELD_ON_APPEAL]: Colors.RED2,

  [CR.State.ACCEPTED]: Colors.GREEN2,
  [CR.State.ACCEPTED_ON_APPEAL]: Colors.GREEN2,
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
      canBeTransitionedBy: (s) => isOwner(s) || isManager(s),
      Widget: RegisterManagerNotesWidget,
      func: applyRegisterManagerDecision,
    },
    [CR.State.RETURNED_FOR_CLARIFICATION]: {
      title: "Return for clarification",
      targetState: CR.State.RETURNED_FOR_CLARIFICATION,
      canBeTransitionedBy: (s) => isOwner(s) || isManager(s),
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
      canBeTransitionedBy: (s) => isOwner(s) || isControlBody(s),
      Widget: ControlBodyDecisionWidget,
      func: applyControlBodyDecision,
    },
    [CR.State.ACCEPTED]: {
      title: "Accept",
      targetState: CR.State.ACCEPTED,
      canBeTransitionedBy: (s) => isOwner(s) || isControlBody(s),
      Widget: ControlBodyDecisionWidget,
      func: (cr, controlBodyInput) => ({
        ...applyControlBodyDecision(cr, controlBodyInput),
        timeDisposed: new Date(),
      }),
    },
    [CR.State.REJECTED]: {
      title: "Reject",
      targetState: CR.State.REJECTED,
      canBeTransitionedBy: (s) => isOwner(s) || isControlBody(s),
      Widget: ControlBodyDecisionWidget,
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
      canBeTransitionedBy: isOwner,
      Widget: RegisterOwnerNotesWidget,
      func: applyRegisterOwnerDecision,
    },
    [CR.State.REJECTION_UPHELD_ON_APPEAL]: {
      title: "Uphold rejection",
      targetState: CR.State.REJECTION_UPHELD_ON_APPEAL,
      canBeTransitionedBy: isOwner,
      Widget: RegisterOwnerNotesWidget,
      func: applyRegisterOwnerDecision,
    },
  },
} as const;


export default TransitionOptions;
