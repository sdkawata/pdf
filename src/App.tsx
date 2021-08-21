import React, {useEffect, useState} from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import {parse, Document, IndirectObject} from './parser'
import { PdfArray, PdfDict, PdfName, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
import { currentDocumentState, leftPanelState, rightPanelState } from "./states"


const HalfPanel = styled.div`
width: calc(50% - 4px);
margin: 2px;
border: 1px solid #eee;
box-shadow: 1px 1px 1px #eee;
height: 100%;
overflow-y: scroll;
`

const ObjectRow = styled.div`
cursor: pointer;
`

const Error = styled.div`
background-color: red;
`

const ObjectDisplay: React.FC<{object:PdfTopLevelObject, indent?:number, prefix?: string}> = ({object, indent, prefix}) => {
  prefix = prefix || ""
  indent = indent || 0
  const style={marginLeft: `${indent*10}px`}
  const prefixed = (e: React.ReactElement) => <span style={style}>{prefix}{e}</span>
  if (object instanceof PdfDict) {
    return (<>
        {prefixed(<>{"{"}</>)}<br/>
        {Object.keys(object.dict).map((key) => (
          <React.Fragment key={key}>
            <ObjectDisplay object={object.dict[key]} indent={indent+1} prefix={`/${key} `}/>
            <br/>
          </React.Fragment>
        ))}
        {prefixed(<span style={style}>{"}"}</span>)}<br/>
      </>
    )
  } else if (object instanceof PdfArray) {
    return (
      <>
        {prefixed(<>[</>)}<br/>
        {object.array.map((obj, idx) => (
          <React.Fragment key={idx}>
            <ObjectDisplay object={obj} indent={indent+1}/>
            <br/>
          </React.Fragment>
        ))}
        {<span style={style}>]</span>}<br/>
      </>
    )
  } else if (object instanceof PdfStream) {
    return  prefixed(<>{"stream obj offset:" + object.offset}</>)
  } else if (object instanceof PdfName) {
    return prefixed(<>{"/" + object.name}</>)
  } else if (object instanceof PdfRef) {
    return prefixed(<>{"ref:" + object.objNumber + " " + object.gen}</>)
  }
  return prefixed(<>{object}</>)
}

const ErrorDisplay: React.FC<{message:string}> = ({message}) => {
  return <Error>{message}</Error>
}

const RightPanel: React.FC = () => {
  const rightPanel = useRecoilValue(rightPanelState)
  if (rightPanel.state === "object") {
    return <ObjectDisplay object={rightPanel.value}/>
  } else if (rightPanel.state === "error") {
    return <ErrorDisplay message={rightPanel.message}/>
  }
  return <></>
}

const LeftPanel: React.FC = () => {
  const currentDocument = useRecoilValue(currentDocumentState)
  const leftPanel = useRecoilValue(leftPanelState)
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
  const showObject = (object: IndirectObject | null) => {
    if (object === null) {
      return
    }
    try {
      const value = object.getValue()
      setRightPanel({state: "object", value})
    } catch (e) {
      setRightPanel({state: "error", message: e.message})
    }
  }
  if (currentDocument) {
    const pdfObjects = currentDocument.getTableEntries()
    return (
      <>
        {pdfObjects.map((object,index) => {
          return <ObjectRow key={index} onClick={() => showObject(object)}>index:{index} {object ? <>gen:{object.gen} offset:{object.offset}</> : <></>}</ObjectRow>
        })}
      </>
    )
  } else {
    return <>waiting for file. drag and drop pdf...</>
  }
}

const App: React.FC = () => {
  const [currentDocument, setCurrentDocument] = useRecoilState(currentDocumentState)
  useEffect(() => {
    const dragOverListener = (e:DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
    const dragEnterListener = (e:DragEvent) => {
      e.preventDefault()
    }
    const dropListener = async (e:DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0];
      const arrayBuffer = await new Promise((resolve) => {
        let reader = new FileReader()
        reader.addEventListener('load', () => {
          resolve(reader.result as ArrayBuffer)
        })
        reader.readAsArrayBuffer(file)
      }) as ArrayBuffer
      const pdfDocument = await parse(arrayBuffer)
      setCurrentDocument(pdfDocument)
    }
    document.body.addEventListener('dragover', dragOverListener)
    document.body.addEventListener('dragenter', dragEnterListener)
    document.body.addEventListener('drop', dropListener)
    return () => {
      document.body.removeEventListener('dragover', dragOverListener)
      document.body.removeEventListener('dragenter', dragEnterListener)
      document.body.removeEventListener('drop', dropListener)
    }
  }, [])
  return (
    <>
      <HalfPanel>
        <LeftPanel/>
      </HalfPanel>
      <HalfPanel>
        <RightPanel/>
      </HalfPanel>
    </>
  )
}

export default App