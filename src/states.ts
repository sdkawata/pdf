import { atom } from "recoil";
import {PdfDocument, IndirectObject} from "./parser"

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
  objectNumber: number,
  gen: number,
} | {
  state: "none",
}

export const rightPanelState = atom<RightPanelStateType>({
  key: "rightPanel",
  default: {state: "none"}
})

export const currentDocumentState = atom<PdfDocument | null>({
  key: "currentDocument",
  default: null,
})