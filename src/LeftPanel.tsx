import React from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import { IndirectObject } from "./parser"
import { currentDocumentState, leftPanelState, rightPanelState } from "./states"

const tabHeight = "40px"
const StyledTabSelector = styled.div`
height: ${tabHeight};
width: 100%;
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
  const leftPanel = useRecoilValue(leftPanelState)
  return <StyledTabSelector>
    <StyledTab selected={leftPanel.tab === "objects"}>objects</StyledTab>
    <StyledTab>trailer</StyledTab>
  </StyledTabSelector>
}

const ObjectRow = styled.div<{selected?:boolean}>`
cursor: pointer;
background-color: ${props => props.selected ? "#ccc": "white"}
`

const LeftPanelWrapper = styled.div`
height: calc(100% - ${tabHeight});
overflow-y:scroll;
`

const Panel: React.FC = () => {
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