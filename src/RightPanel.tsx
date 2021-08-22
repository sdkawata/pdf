import React, { useMemo, useState } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import { PdfArray, PdfDict, PdfName, PdfObject, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
import { currentDocumentState, rightPanelState } from "./states"
import styled from "styled-components"
import ObjectTree from "./ObjectTree"
import Pako from "pako"

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

type ValueGetter = (objNumber: number, gen: number) => PdfTopLevelObject

const tryDefilter = (getter: ValueGetter, stream: PdfStream): {info: string, buf: ArrayBuffer} => {
  const buffer = stream.getValue(getter)
  const filter = stream.dict.dict.get('Filter')
  if (filter && filter instanceof PdfName && filter.name === "FlateDecode") {
    try {
      const deflated = Pako.inflate(new Uint8Array(buffer))
      return {
        info: "decoded by deflate",
        buf: deflated,
      }
    } catch (e) {
      throw e
    }
  } else {
    return {
      info: "raw data",
      buf: buffer
    }
  }
}

const StreamDisplay: React.FC<{stream:PdfStream}> = ({stream}) => {
  const getter = (objNumber, gen) => (
    currentDocument.getTableEntry(objNumber, gen).getValue()
  )
  const currentDocument = useRecoilValue(currentDocumentState)
  const length = stream.getLength(getter)
  const displayed = length < 10000
  const download = (e:React.MouseEvent) => {
    // cf: https://stackoverflow.com/questions/19327749/javascript-blob-filename-without-link
    e.preventDefault()
    let {info, buf} = tryDefilter(getter, stream)
    const a = document.createElement("a")
    document.body.appendChild(a)
    const url = window.URL.createObjectURL(new Blob([buf]))
    a.href = url
    a.download="pdf-innerfile"
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }
  let errors : string[] = []
  let {info, str} = displayed ? (() => {
    try {
      let {info, buf} = tryDefilter(getter, stream)
      return {info, str: String.fromCharCode.apply("", new Uint8Array(buf))}
    } catch (e) {
      console.log(e)
      errors.push(e.message)
      return {info: "", str: ""}
    }
  })() : {info:"", str: ""}
  return (
    <>
      stream: offset:{stream.offset} length:{length}
      <br/>
      <ObjectDisplay object={stream.dict} prefix="stream dictionary " />
      <br/>
      {errors.length > 0 && <Error>{errors.join("\n")}</Error>}
      {info !== "" && <div>{info}</div>}
      {str !== "" && 
      <ObjectDisplayWrapper><pre><code>{str}</code></pre></ObjectDisplayWrapper>
      }
      <a href="/" onClick={download}>try download</a>
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