import React from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import { IndirectObject } from "./parser"
import { PdfArray, PdfDict, PdfName, PdfRef, PdfTopLevelObject } from "./parser/objectparser"
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

const ObjectList = styled.ul`
list-style: none;
margin: 0 0 0 15px;
padding: 0;
`
const ObjectListItem = styled.li`
list-style: none;
`
const TreeRecursive: React.FC<{object:PdfTopLevelObject, prefix: string, indent:number}> = ({
  object,prefix,indent
}) => {
  const currentDocument = useRecoilValue(currentDocumentState)
  const prefixed = (e: React.ReactElement) => <span>{prefix}{e}</span>
  if (object instanceof PdfDict) {
    const children = Array.from(object.dict.entries())
      .filter(([key, value]) => value instanceof PdfRef)
      .map(([key, value]) => (
          <ObjectListItem>
            <TreeRecursive object={value} prefix={"/" + key + " "} indent={indent+1}/>
          </ObjectListItem>)
      )
    if (children.length > 0) {
      return (
        <div>
            <ObjectListItem>{prefixed(<></>)}</ObjectListItem>
            <ObjectList>
              {children}
            </ObjectList>
        </div>
      )
    } else {
      return prefixed(<>{"{map}"}</>)
    }
  } else if (object instanceof PdfArray) {
    return prefixed(<>[array]</>)
  } else if (object instanceof PdfName) {
    return prefixed(<>{"/" + object.name}</>)
  } else if (object instanceof PdfRef) {
    const value = currentDocument.getTableEntry(object.objNumber).getValue()
    return <TreeRecursive object={value} prefix={`${prefix} ref ${object.objNumber} `} indent={indent}/>
  }
  return prefixed(<>{object}</>)
}
const Tree: React.FC = () => {
  const currentDocument = useRecoilValue(currentDocumentState)
  return <TreeRecursive object={currentDocument.trailer} prefix="trailer" indent={0}/>
}

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
  if (! currentDocument) {
    return <>waiting for file. drag and drop pdf...</>
  }
  if (leftPanel.tab === "objects") {
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
  } else if (leftPanel.tab === "tree") {
    return <Tree/>
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