import { atom } from "recoil";
import {PdfDocument, IndirectObject} from "./parser"
import { autoDecode } from "./coding";

export type LeftPanelStateType = {
  tab: "objects"
} | {
  tab: "tree"
}| {
  tab: "misc"
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

export const filenameState = atom<string | undefined>({
  key: 'filename',
  default: undefined,
})

type Displayer = (buf: ArrayBuffer) => string
export const useStringDisplayer = ():Displayer => {
  return autoDecode
}