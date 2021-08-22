import { atom } from "recoil";
import {Document, IndirectObject} from "./parser"

export type LeftPanelStateType = {
  tab: "objects"
} | {
  tab: "tree"
}

export const leftPanelState = atom<LeftPanelStateType>({
  key: 'leftPanel',
  default: {tab: "objects"}
})

export type RightPanelStateType = {
  state: "object",
  object: IndirectObject,
} | {
  state: "none",
}

export const rightPanelState = atom<RightPanelStateType>({
  key: "rightPanel",
  default: {state: "none"}
})

export const currentDocumentState = atom<Document | null>({
  key: "currentDocument",
  default: null,
})