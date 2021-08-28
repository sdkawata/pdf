import { atom, useRecoilState, useRecoilValue } from "recoil";
import {PdfDocument, IndirectObject} from "./parser"
import { autoDecode } from "./coding";
import {v4 as uuidv4} from "uuid"
import { useCallback } from "react";

let documentMap: Map<string, PdfDocument> = new Map()

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

export const currentDocumentIdState = atom<string | null>({
  key: "currentDocumentId",
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

export const useCurrentDocument = () => {
  const currentDocumentId = useRecoilValue(currentDocumentIdState)
  return documentMap.get(currentDocumentId)
}


export const useCurrentDocumentSetter = () => {
  const [currentDocumentId, setCurrentDocumentId] = useRecoilState(currentDocumentIdState)
  return useCallback((document: PdfDocument) => {
    const newId = uuidv4()
    documentMap.set(newId, document)
    documentMap.delete(currentDocumentId)
    setCurrentDocumentId(newId)
  }, [currentDocumentId])
}