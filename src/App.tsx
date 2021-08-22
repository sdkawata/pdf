import React, {useEffect} from "react"
import { useRecoilState } from "recoil"
import styled from "styled-components"
import {parse} from './parser'
import { currentDocumentState, rightPanelState } from "./states"
import LeftPanel from "./LeftPanel"
import RightPanel from "./RightPanel"


const HalfPanel = styled.div`
width: calc(50% - 4px);
margin: 2px;
border: 1px solid #eee;
box-shadow: 1px 1px 1px #eee;
height: 100%;
overflow: hidden;
`



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
      const pdfDocument = parse(arrayBuffer)
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