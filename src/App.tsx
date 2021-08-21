import React, {useEffect, useState} from "react"
import styled from "styled-components"
import {parse, Document, IndirectObject} from './parser'
import { PdfArray, PdfDict, PdfName, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"


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
const asJsObject = (object:PdfTopLevelObject): any => {
  if (object instanceof PdfDict) {
    const ret = {}
    Object.keys(object.dict).map((key) => {
      ret[key] = asJsObject(object.dict[key])
    })
    return ret
  } else if (object instanceof PdfArray) {
    return object.array.map((o) => asJsObject(o))
  } else if (object instanceof PdfStream) {
    return "stream obj offset:" + object.offset
  } else if (object instanceof PdfName) {
    return "name:" + object.name
  } else if (object instanceof PdfRef) {
    return "ref:" + object.objNumber + " " + object.gen
  }
  return object
}
const ObjectDisplay: React.FC<{object:IndirectObject}> = ({object}) => {
  return <pre><code>{JSON.stringify(asJsObject(object.getValue()), null, "  ")}</code></pre>
}

const App: React.FC = () => {
  const [pdfDocument, setPdfDocument] = useState<Document | null>(null)
  const [pdfObjects, setPdfObjects] = useState<(IndirectObject | null)[]>([])
  const [leftInfo, setLeftInfo] = useState<React.ReactElement | null>(null);
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
      setPdfDocument(pdfDocument)
      setPdfObjects(pdfDocument.getTableEntries())
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
  const showObject = (object:IndirectObject) => {
    setLeftInfo(<ObjectDisplay object={object}/>)
  }
  return (
    <>
      <HalfPanel>
        {pdfObjects.map((object,index) => {
          return <ObjectRow key={index} onClick={() => object ? showObject(object) : null}>index:{index} {object ? <>gen:{object.gen} offset:{object.offset}</> : <></>}</ObjectRow>
        })}
      </HalfPanel>
      <HalfPanel>
        <>{leftInfo}</>
      </HalfPanel>
    </>
  )
}

export default App