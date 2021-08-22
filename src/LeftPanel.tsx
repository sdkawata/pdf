import React, { useState } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import { IndirectObject } from "./parser"
import { PdfArray, PdfDict, PdfName, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
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
margin: 0;
padding: 0;
`
const ObjectListItem = styled.li<{openable?:boolean}>`
list-style: none;
margin: 0 0 0 15px;
`

const OpenIcon = styled.span<{opened:boolean}>`
width: 0px;
display: inline-block;
position: relative;
&:before {
  position: absolute;
  display: block;
  content: ">";
  top: -16px;
  left: -15px;
  font-size: 15px;
  font-weight:bold;
  ${props => props.opened ? "transform:rotate(90deg);" : ""}
  cursor: pointer;
}
}
`;
const TreeRecursive: React.FC<{object:PdfTopLevelObject, prefix: React.ReactElement, defaultOpened?:boolean}> = ({
  object,prefix,defaultOpened = false
}) => {
  const [opened, setOpened] = useState(defaultOpened)
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
  const currentDocument = useRecoilValue(currentDocumentState)
  const prefixed = (e: React.ReactElement, openable:boolean = false) => (<>
    <ObjectListItem openable={openable}>
      {openable ? <OpenIcon opened={opened} onClick={() => setOpened(b => !b)}/> : <></>}
      {prefix}{e}
    </ObjectListItem>
  </>)
  if (object instanceof PdfDict) {
    if (opened) {
      const children = Array.from(object.dict.entries())
      .map(([key, value]) => (
        <TreeRecursive key={key} object={value} prefix={<>{"/" + key + " "}</>} defaultOpened={true}/>
      ))
      return prefixed(<>
        <ObjectList>
          {children}
        </ObjectList>
      </>, true)
    } else {
      return prefixed(<>{"{dict}"}</>, true)
    }
  } else if (object instanceof PdfArray) {
    if (opened) {
      const children = object.array
      .map((value, idx) => (
        <TreeRecursive key={idx} object={value} prefix={<></>} defaultOpened={true}/>
      ))
      return prefixed(<>
        <ObjectList>
          {children}
        </ObjectList>
      </>, true)
    } else {
      return prefixed(<>{"[array]"}</>, true)
    }
  } else if (object instanceof PdfName) {
    return prefixed(<>{"/" + object.name}</>)
  } else if (object instanceof PdfRef) {
    const onClick = (e) => {
      e.preventDefault()
      setRightPanel({state: "object", object: currentDocument.getTableEntry(object.objNumber)})
    }
    const value = currentDocument.getTableEntry(object.objNumber).getValue()
    return <TreeRecursive
      object={value}
      prefix={<>{prefix}<a href="./" onClick={onClick}>{`ref ${object.objNumber}`}</a>{" "}</>}
      defaultOpened={false}
    />
  } else if (object instanceof PdfStream) {
    return prefixed(<>stream</>)
  }
  return prefixed(<>{object}</>)
}
const Tree: React.FC = () => {
  const currentDocument = useRecoilValue(currentDocumentState)
  return <ObjectList>
    <TreeRecursive object={currentDocument.trailer} prefix={<>trailer</>} defaultOpened={true}/>
  </ObjectList>
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