import React from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import { filenameState, leftPanelState, rightPanelState, useCurrentDocument} from "./states"
import ObjectTree from "./ObjectTree"
import { UncompressedIndirectObject } from "./parser"

const tabHeight = "40px"
const StyledTabSelector = styled.div`
height: ${tabHeight};
width: 100%;
`

const LeftPanelWrapper = styled.div`
height: calc(100% - ${tabHeight});
overflow-y:scroll;
`

const StyledTab = styled.div<{selected?:boolean}>`
display:inline-block;
border-radius: 10px 10px 0 0;
border-width: 1px 1px ${props => props.selected ? "0" : "1px"} 1px;
border-style: solid;
border-color: #ccc;
padding:5px;
cursor:pointer;
background-color: ${props => props.selected ? "#ffd580" : ""}
`
const TabSelector:React.FC = () => {
  const [leftPanel, setLeftPanel] = useRecoilState(leftPanelState)
  return <StyledTabSelector>
    <StyledTab
      selected={leftPanel.tab === "objects"}
      onClick={() => setLeftPanel({tab: "objects"})}
    >objects</StyledTab>
    <StyledTab
      selected={leftPanel.tab === "tree"}
      onClick={() => setLeftPanel({tab: "tree"})}
    >tree</StyledTab>
    <StyledTab
    selected={leftPanel.tab === "misc"}
    onClick={() => setLeftPanel({tab: "misc"})}
  >misc</StyledTab>
  </StyledTabSelector>
}

const ObjectRow = styled.div<{selected?:boolean}>`
cursor: pointer;
background-color: ${props => props.selected ? "#ccc": "white"}
`

const Panel: React.FC = () => {
  const currentDocument = useCurrentDocument()
  const filename = useRecoilValue(filenameState)
  const leftPanel = useRecoilValue(leftPanelState)
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
  const showObject = (objectNumber: number, gen: number) => {
    setRightPanel({state: "object", objectNumber, gen})
  }
  if (! currentDocument) {
    return <>waiting for file. drag and drop pdf...</>
  }
  if (leftPanel.tab === "objects") {
    const pdfObjects = currentDocument.tableEntries
    return (
      <>
        {pdfObjects.map((object,index) => {
          return <ObjectRow
            selected={rightPanel.state==="object" && rightPanel.objectNumber === index}
            key={index}
            onClick={() => showObject(object.objNumber, object.gen)}
          >
            index:{index} {object ? <>gen:{object.gen} {
              object instanceof UncompressedIndirectObject
              ? "uncompressed"
              : "compressed"
            }</> : <></>}
          </ObjectRow>
        })}
      </>
    )
  } else if (leftPanel.tab === "tree") {
    return <ObjectTree object={currentDocument.trailer} prefix="trailer" />
  } else if (leftPanel.tab === "misc") {
    return (<>
      <div>filename:{filename}</div>
      <div>header: {currentDocument.header}</div>
    </>)
  }
  return null
}

const LeftPanel: React.FC = () => {
  return (
    <>
      <TabSelector/>
      <LeftPanelWrapper>
        <Panel/>
      </LeftPanelWrapper>
    </>
  )
}

export default LeftPanel