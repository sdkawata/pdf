import React, { useState } from "react"
import { useRecoilState, useRecoilValue } from "recoil"
import styled from "styled-components"
import { PdfArray, PdfDict, PdfName, PdfObject, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
import { rightPanelState, useCurrentDocument, useStringDisplayer } from "./states"
import {Error} from "./styled"


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
const TreeRecursive: React.FC<{object:PdfTopLevelObject, prefix: React.ReactElement, defaultOpened?:boolean}> = ({
  object,prefix,defaultOpened = false
}) => {
  const [opened, setOpened] = useState(defaultOpened)
  const [rightPanel, setRightPanel] = useRecoilState(rightPanelState)
  const currentDocument = useCurrentDocument()
  const displayer = useStringDisplayer()
  if (currentDocument === undefined) {
    return <></>
  }
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
    const onClick = (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setRightPanel({state: "object", objectNumber: object.objNumber, gen:object.gen})
    }
    try {
      const value = currentDocument.getObject(object.objNumber)?.getValue(currentDocument)
      if (!value) {
        return <ObjectListItem><Error>{`ref ${object.objNumber}`}{"failed to get object"}</Error></ObjectListItem>
      }
      return <TreeRecursive
        object={value}
        prefix={<>{prefix}<a href="./" onClick={onClick}>{`ref ${object.objNumber}`}</a>{" "}</>}
        defaultOpened={false}
      />
    } catch (e) {
      return <ObjectListItem><Error>{e.message}</Error></ObjectListItem>
    }
  } else if (object instanceof PdfStream) {
    return prefixed(<>stream</>)
  } else if (object instanceof ArrayBuffer) {
    return prefixed(<>{displayer(object)}</>)
  }
  return prefixed(<>{object}</>)
}
const ObjectTree: React.FC<{object: PdfObject, prefix: string}> = ({object, prefix}) => {
  return <ObjectList>
    <TreeRecursive object={object} prefix={<>{prefix}</>} defaultOpened={true}/>
  </ObjectList>
}

export default ObjectTree