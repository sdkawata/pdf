import React, { useState } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import { PdfArray, PdfDict, PdfName, PdfObject, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
import { currentDocumentState, rightPanelState } from "./states"


const ObjectList = styled.ul`
list-style: none;
margin: 0;
padding: 0;
`
const ObjectListItem = styled.li<{openable?:boolean}>`
list-style: none;
margin: 0 0 0 15px;
`

const ObjectListLine = styled.div<{openable?:boolean}>`
${props => props.openable ? "cursor:pointer;" : ""}
&:hover {
  background-color: #ffeccc;
}
`

const OpenIcon = styled.span<{opened:boolean}>`
width: 0px;
display: inline-block;
position: relative;
&:before {
  position: absolute;
  display: block;
  content: ${props => props.opened ? "'-'" : "'+'"};
  top: -14px;
  left: -15px;
  font-size: 12px;
  font-weight:bold;
  cursor: pointer;
}
}
`;
const ErrorLine = styled.div`
background-color: pink;
`;
const TreeRecursive: React.FC<{object:PdfTopLevelObject, prefix: React.ReactElement, defaultOpened?:boolean}> = ({
  object,prefix,defaultOpened = false
}) => {
  const [opened, setOpened] = useState(defaultOpened)
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
  const currentDocument = useRecoilValue(currentDocumentState)
  const prefixed = (e: React.ReactElement, openable:boolean = false, children?: React.ReactElement) => (<>
    <ObjectListItem openable={openable}>
      <ObjectListLine onClick={() => setOpened(b => !b)} openable={openable}>
        {openable ? <OpenIcon opened={opened}/> : <></>}
        {prefix}{e}
      </ObjectListLine>
      {children}
    </ObjectListItem>
  </>)
  if (object instanceof PdfDict) {
    if (opened) {
      const children = Array.from(object.dict.entries())
      .map(([key, value]) => (
        <TreeRecursive key={key} object={value} prefix={<>{"/" + key + " "}</>} defaultOpened={true}/>
      ))
      return prefixed(<></>,true, <>
        <ObjectList>
          {children}
        </ObjectList>
      </>)
    } else {
      return prefixed(<>{"{dict}"}</>, true)
    }
  } else if (object instanceof PdfArray) {
    if (opened) {
      const children = object.array
      .map((value, idx) => (
        <TreeRecursive key={idx} object={value} prefix={<></>} defaultOpened={true}/>
      ))
      return prefixed(<></>, true, <>
        <ObjectList>
          {children}
        </ObjectList>
      </>)
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
    try {
      const value = currentDocument.getTableEntry(object.objNumber).getValue()
      return <TreeRecursive
        object={value}
        prefix={<>{prefix}<a href="./" onClick={onClick}>{`ref ${object.objNumber}`}</a>{" "}</>}
        defaultOpened={false}
      />
    } catch (e) {
      return <ObjectListItem><ErrorLine>{e.message}</ErrorLine></ObjectListItem>
    }
  } else if (object instanceof PdfStream) {
    return prefixed(<>stream</>)
  }
  return prefixed(<>{object}</>)
}
const ObjectTree: React.FC<{object: PdfObject, prefix: string}> = ({object, prefix}) => {
  const currentDocument = useRecoilValue(currentDocumentState)
  return <ObjectList>
    <TreeRecursive object={object} prefix={<>{prefix}</>} defaultOpened={true}/>
  </ObjectList>
}

export default ObjectTree