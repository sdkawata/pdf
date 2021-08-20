import React, {useEffect, useState} from "react"
import styled from "styled-components"
import {parse, Document} from './parser'

const Base = styled.div`
max-width: 100%;
max-height: 100%;
`

const App: React.FC = () => {
  const [pdfDocument, setPdfDocument] = useState<Document | null>(null)
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
      console.log(pdfDocument.getTableEntries())
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
  return <Base>hello</Base>
}

export default App