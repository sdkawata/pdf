import React, { useMemo, useState } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { PdfArray, PdfDict, PdfName, PdfObject, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
import { currentDocumentState, rightPanelState } from "./states"
import styled from "styled-components"
import ObjectTree from "./ObjectTree"

const Error = styled.div`
background-color: red;
`

const ObjectDisplayWrapper = styled.div`
border: 1px solid #aaa;
`

const ObjectDisplay: React.FC<{object:PdfObject, prefix:string}> = ({
  object, prefix
}) => {
  return <ObjectDisplayWrapper><ObjectTree object={object} prefix={prefix} /></ObjectDisplayWrapper>
}

const StreamDisplay: React.FC<{stream:PdfStream}> = ({stream}) => {
  const getter = (objNumber, gen) => (
    currentDocument.getTableEntry(objNumber, gen).getValue()
  )
  const currentDocument = useRecoilValue(currentDocumentState)
  const length = stream.getLength(getter)
  const [displayed, setDisplayed] = useState(length < 10000)
  const str = useMemo(() => {
    if (displayed) {
      const buffer = stream.getValue(getter)
      return String.fromCharCode.apply("", new Uint8Array(buffer))
    } else {
      return ""
    }
  }, [stream, displayed])
  return (
    <>
      stream: offset:{stream.offset} length:{length}
      <br/>
      <ObjectDisplay object={stream.dict} prefix="stream dictionary " />
      <br/>
      <ObjectDisplayWrapper><pre><code>{str}</code></pre></ObjectDisplayWrapper>
    </>
  )
}

const TopLevelObjectDisplay:React.FC<{object: PdfTopLevelObject}> = ({object}) => {
  if (object instanceof PdfStream) {
    return <StreamDisplay stream={object}/>
  } else {
    return <ObjectDisplay object={object} prefix={`object `}/>
  }
}

const ErrorDisplay: React.FC<{message:string}> = ({message}) => {
  return <Error>{message}</Error>
}


const PanelWrapper = styled.div`
height: 100%;
overflow:scroll;
`

const Panel: React.FC = () => {
  const currentDocument = useRecoilValue(currentDocumentState)
  const rightPanel = useRecoilValue(rightPanelState)
  const objectPanel = useMemo(() => {
    if (rightPanel.state === "object") {
      try {
        const {objectNumber, gen} = rightPanel
        const object = currentDocument.getTableEntry(objectNumber, gen)
        const value = object.getValue()
        return (
          <>
            <div>objNumber: {objectNumber} gen:{gen} offset: {object.offset}</div>
            <TopLevelObjectDisplay object={value}/>
          </>
        )
      } catch(e) {
        console.log(e)
        return <ErrorDisplay message={e.message}/>
      }
    } else {
      return null
    }
  }, [rightPanel])
  if (objectPanel) {
    return objectPanel;
  }
  return <></>
}
const RightPanel:React.FC = () => {
  return (
    <PanelWrapper>
      <Panel/>
    </PanelWrapper>
  )
}

export default RightPanel