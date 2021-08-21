import React, {useEffect, useMemo, useState} from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import {parse, Document, IndirectObject} from './parser'
import { PdfArray, PdfDict, PdfName, PdfObject, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
import { currentDocumentState, leftPanelState, rightPanelState } from "./states"


const HalfPanel = styled.div`
width: calc(50% - 4px);
margin: 2px;
border: 1px solid #eee;
box-shadow: 1px 1px 1px #eee;
height: 100%;
overflow-y: scroll;
`

const ObjectRow = styled.div<{selected?:boolean}>`
cursor: pointer;
background-color: ${props => props.selected ? "#ccc": "white"}
`

const Error = styled.div`
background-color: red;
`

const ValueField = styled.div`
background-color: #ccc;
padding: 5px;
`

const ObjectDisplayRecursive: React.FC<{object:PdfObject, indent?:number, prefix?: string}> = ({object, indent, prefix}) => {
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
  const currentDocument = useRecoilValue(currentDocumentState)
  prefix = prefix || ""
  indent = indent || 0
  const style={marginLeft: `${indent*10}px`}
  const prefixed = (e: React.ReactElement) => <span style={style}>{prefix}{e}</span>
  if (object instanceof PdfDict) {
    return (<>
        {prefixed(<>{"{"}</>)}<br/>
        {Object.keys(object.dict).map((key) => (
          <React.Fragment key={key}>
            <ObjectDisplayRecursive object={object.dict[key]} indent={indent+1} prefix={`/${key} `}/>
            <br/>
          </React.Fragment>
        ))}
        {<span style={style}>{"}"}</span>}
      </>
    )
  } else if (object instanceof PdfArray) {
    return (
      <>
        {prefixed(<>[</>)}<br/>
        {object.array.map((obj, idx) => (
          <React.Fragment key={idx}>
            <ObjectDisplayRecursive object={obj} indent={indent+1}/>
            <br/>
          </React.Fragment>
        ))}
        {<span style={style}>]</span>}
      </>
    )
  } else if (object instanceof PdfName) {
    return prefixed(<>{"/" + object.name}</>)
  } else if (object instanceof PdfRef) {
    const onClick = (e) => {
      e.preventDefault()
      setRightPanel({state: "object", object: currentDocument.getTableEntry(object.objNumber)})
    }
    return prefixed(<a href={"./"} onClick={onClick}>{"ref:" + object.objNumber + " " + object.gen}</a>)
  }
  return prefixed(<>{object}</>)
}


const ObjectDisplay: React.FC<{object:PdfObject}> = ({object}) => {
  return <ValueField><ObjectDisplayRecursive object={object}/></ValueField>
}

const StreamDisplay: React.FC<{stream:PdfStream}> = ({stream}) => {
  const str = useMemo(() => {
    const buffer = stream.getValue()
    return String.fromCharCode.apply("", new Uint8Array(buffer))
  }, [stream])
  return (
    <>
      stream: offset:{stream.offset} dictionary:
      <br/>
      <ObjectDisplay object={stream.dict}/>
      <br/>
      <ValueField><pre><code>{str}</code></pre></ValueField>
    </>
  )
}

const TopLevelObjectDisplay:React.FC<{object: PdfTopLevelObject}> = ({object}) => {
  if (object instanceof PdfStream) {
    return <StreamDisplay stream={object}/>
  } else {
    return <ObjectDisplay object={object} />
  }
}

const ErrorDisplay: React.FC<{message:string}> = ({message}) => {
  return <Error>{message}</Error>
}

const RightPanel: React.FC = () => {
  const rightPanel = useRecoilValue(rightPanelState)
  const objectPanel =useMemo(() => {
    if (rightPanel.state === "object") {
      try {
        const value = rightPanel.object.getValue()
        return <TopLevelObjectDisplay object={value}/>
      } catch(e) {
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

const LeftPanel: React.FC = () => {
  const currentDocument = useRecoilValue(currentDocumentState)
  const leftPanel = useRecoilValue(leftPanelState)
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
  const showObject = (object: IndirectObject | null) => {
    if (object === null) {
      return
    }
    setRightPanel({state: "object", object})
  }
  if (currentDocument) {
    const pdfObjects = currentDocument.getTableEntries()
    return (
      <>
        {pdfObjects.map((object,index) => {
          return <ObjectRow
            selected={rightPanel.state==="object" && rightPanel.object.index === index}
            key={index}
            onClick={() => showObject(object)}
          >
            index:{index} {object ? <>gen:{object.gen} offset:{object.offset}</> : <></>}
          </ObjectRow>
        })}
      </>
    )
  } else {
    return <>waiting for file. drag and drop pdf...</>
  }
}

const App: React.FC = () => {
  const [currentDocument, setCurrentDocument] = useRecoilState(currentDocumentState)
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
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
      setRightPanel({state: "none"})
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