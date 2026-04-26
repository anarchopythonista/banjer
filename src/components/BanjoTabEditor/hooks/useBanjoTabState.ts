import { useReducer } from "react";
import { banjoTabReducer, createInitialEditorState } from "../tabReducer";

export function useBanjoTabState() {
  return useReducer(banjoTabReducer, undefined, createInitialEditorState);
}
