import React from "react";

// You should import these from your Toast component file
// import { ToastActionElement, ToastProps } from "@/components/ui/toast";

// Constants
const TOAST_LIMIT = 1;
const TOAST_REMOVE_DELAY = 1000000;

// Action types
const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

// Toast timeouts for auto-removal
const toastTimeouts = new Map();

/**
 * @typedef {Object} ToasterToast
 * @property {string} id
 * @property {React.ReactNode} [title]
 * @property {React.ReactNode} [description]
 * @property {React.ReactElement} [action]
 * @property {boolean} [open]
 * @property {(open: boolean) => void} [onOpenChange]
 */

/**
 * @typedef {Object} State
 * @property {ToasterToast[]} toasts
 */

// Listeners for state changes
const listeners = [];

// In-memory state
let memoryState = { toasts: [] };

/**
 * Add toast to removal queue after delay
 * @param {string} toastId
 */
function addToRemoveQueue(toastId) {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

/**
 * Reducer for toast state
 * @param {State} state
 * @param {Object} action
 * @returns {State}
 */
function reducer(state, action) {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case "DISMISS_TOAST": {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      };
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };

    default:
      return state;
  }
}

/**
 * Dispatches an action and notifies listeners
 * @param {Object} action
 */
function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

/**
 * Create a new toast
 * @param {Object} props
 * @returns {{ id: string, dismiss: Function, update: Function }}
 */
function toast(props) {
  const id = genId();

  const update = (updateProps) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...updateProps, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

/**
 * React hook to use toast state and actions
 */
function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
    // eslint-disable-next-line
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) =>
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId }),
  };
}

export { useToast, toast };
