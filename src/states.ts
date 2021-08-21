import { atom } from "recoil";
import {Document} from "./parser"
import { PdfTopLevelObject } from "./parser/objectparser";

export type LeftPanelStateType = {
  tab: "objects"
}

export const leftPanelState = atom<LeftPanelStateType>({
  key: 'leftPanel',
  default: {tab: "objects"}
})

export type RightPanelStateType = {
  state: "object",
  value: PdfTopLevelObject,
} | {
  state: "none",
} | {
  state: "error",
  message: string,
}

export const rightPanelState = atom<RightPanelStateType>({
  key: "rightPanel",
  default: {state: "none"}
})

export const currentDocumentState = atom<Document | null>({
  key: "currentDocument",
  default: null,
})