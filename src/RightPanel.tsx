import React, { useEffect, useMemo, useRef, useState } from "react"
import { errorSelector, useRecoilState, useRecoilValue } from "recoil"
import { PdfArray, PdfDict, PdfName, PdfObject, PdfRef, PdfStream, PdfTopLevelObject } from "./parser/objectparser"
import { currentDocumentState, rightPanelState, useStringDisplayer } from "./states"
import styled from "styled-components"
import ObjectTree from "./ObjectTree"
import Pako from "pako"

const DISPLAY_THRESHOLD = 10000

const StyledError = styled.div`
background-color: red;
`

const ObjectDisplayWrapper = styled.div`
border: 1px solid #aaa;
`

const ObjectDisplay: React.FC<{object:PdfObject, prefix:string}> = ({
  object, prefix
}) => {
  return <ObjectDisplayWrapper><ObjectTree object={object} prefix={prefix} /></ObjectDisplayWrapper>
}

type ValueGetter = (objNumber: number, gen: number) => PdfTopLevelObject

const tryDefilter = (getter: ValueGetter, stream: PdfStream): {info: string, buf: ArrayBuffer} => {
  const buffer = stream.getValue(getter)
  const filter = stream.dict.dict.get('Filter')
  if (filter && (
    (filter instanceof PdfName && filter.name === "FlateDecode") ||
    (filter instanceof PdfArray && filter.array.length === 1 && filter.array[0] instanceof PdfName && filter.array[0].name === "FlateDecode")
  )) {
    try {
      const deflated = Pako.inflate(new Uint8Array(buffer))
      return {
        info: "decoded by deflate",
        buf: deflated,
      }
    } catch (e) {
      throw e
    }
  } else {
    return {
      info: "raw data",
      buf: buffer
    }
  }
}

const isValueEqualName = (dict: PdfDict, key: string, name: string):boolean => {
  const value = dict.dict.get(key)
  return value instanceof PdfName && value.name === name
}

const StreamDisplay: React.FC<{stream:PdfStream}> = ({stream}) => {
  const getter = (objNumber, gen) => (
    currentDocument.getTableEntry(objNumber, gen).getValue()
  )
  const currentDocument = useRecoilValue(currentDocumentState)
  const [showCanvas, setShowCanvas] = useState(false)
  const canvas = useRef<HTMLCanvasElement | undefined>(undefined)
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined)
  const displayer = useStringDisplayer()
  useEffect(() => {
    if (imageUrl !== "") {
      return () => {window.URL.revokeObjectURL(imageUrl)}
    }
  }, [imageUrl])
  const length = stream.getLength(getter)
  const displayed = length < DISPLAY_THRESHOLD
  let errors : string[] = []
  const download = (e:React.MouseEvent) => {
    // cf: https://stackoverflow.com/questions/19327749/javascript-blob-filename-without-link
    e.preventDefault()
    let {info, buf} = tryDefilter(getter, stream)
    const a = document.createElement("a")
    document.body.appendChild(a)
    const url = window.URL.createObjectURL(new Blob([buf]))
    a.href = url
    a.download="pdf-innerfile"
    a.click()
    window.URL.revokeObjectURL(url)
    a.remove()
  }
  const showDrawButton = isValueEqualName(stream.dict, "Subtype", "Image") && isValueEqualName(stream.dict, "Type", "XObject")
  const drawToCanvas = (e:React.MouseEvent) => {
    e.preventDefault()
    try {
      const width = stream.dict.dict.get("Width")
      const height = stream.dict.dict.get("Height")
      if (typeof width !== "number" || typeof height !== "number") {
        throw new Error("invalid width or height")
      }
      if (! isValueEqualName(stream.dict, "ColorSpace", "DeviceRGB")) {
        throw new Error("unsupported colorspace")
      }
      if (stream.dict.dict.get("BitsPerComponent") !== 8) {
        throw new Error("unsupported bitsperComponent")
      }
      let {info, buf} = tryDefilter(getter, stream)
      const expectedSize = width * height * 3
      if (buf.byteLength < expectedSize) {
        throw new Error("unexpected size expected: " + expectedSize + " actual: " + buf.byteLength)
      }
      let view = new Uint8Array(buf)
      canvas.current.width = width
      canvas.current.height = height
      const context = canvas.current.getContext("2d")
      const data = context.getImageData(0,0,width, height)
      const arr = data.data
      for (let iy =0;iy<height;iy++) {
        for (let ix=0;ix<width;ix++) {
          arr[(iy*width + ix)* 4] = view[(iy*width + ix)* 3]
          arr[(iy*width + ix)* 4 + 1] = view[(iy*width + ix)* 3 + 1]
          arr[(iy*width + ix)* 4 + 2] = view[(iy*width + ix)* 3 + 2]
          arr[(iy*width + ix)* 4 + 3] = 255
        }
      }
      context.putImageData(data,0,0)
      setShowCanvas(true)
    } catch (e) {
      console.log(e)
      alert(e.message)
    }
  }
  const loadToImg = (e:React.MouseEvent) => {
    e.preventDefault()
    try {
      let {info, buf} = tryDefilter(getter, stream)
      const url = window.URL.createObjectURL(new Blob([buf]))
      setImageUrl(url)
    } catch (e) {
      console.log(e)
      alert(e.message)
    }
  }
  let {info, str} = displayed ? (() => {
    try {
      console.log(displayed)
      let {info, buf} = tryDefilter(getter, stream)
      if (buf.byteLength >= DISPLAY_THRESHOLD) {
        return {info: "", str: ""}
      }
      return {info, str: displayer(buf)}
    } catch (e) {
      console.log(e)
      errors.push(e.message)
      alert(e.message)
      return {info: "", str: ""}
    }
  })() : {info:"", str: ""}
  return (
    <>
      stream: offset:{stream.offset} length:{length}
      <br/>
      <ObjectDisplay object={stream.dict} prefix="stream dictionary " />
      <br/>
      {errors.length > 0 && <StyledError>{errors.join("\n")}</StyledError>}
      {info !== "" && <div>{info}</div>}
      {str !== "" && 
      <ObjectDisplayWrapper><pre><code>{str}</code></pre></ObjectDisplayWrapper>
      }
      <a href="/" onClick={download}>try download</a><br/>
      <a href="/" onClick={loadToImg}>try load as image</a><br/>
      {showDrawButton && <><a href="/" onClick={drawToCanvas}>try draw to canvas</a><br/></>}
      <canvas ref={canvas} style={{width: "100%", display: showCanvas ? '' : 'none'}}/>
      <img src={imageUrl} style={{width: "100%", display: imageUrl ? '' : 'none'}}/>
    </>
  )
}

const TopLevelObjectDisplay:React.FC<{object: PdfTopLevelObject}> = ({object}) => {
  if (object instanceof PdfStream) {
    return <StreamDisplay stream={object}/>
  } else {
    return <ObjectDisplay object={object} prefix={`object `}/>
  }
}

const ErrorDisplay: React.FC<{message:string}> = ({message}) => {
  return <StyledError>{message}</StyledError>
}


const PanelWrapper = styled.div`
height: 100%;
overflow:scroll;
`

const Panel: React.FC = () => {
  const currentDocument = useRecoilValue(currentDocumentState)
  const rightPanel = useRecoilValue(rightPanelState)
  const objectPanel = useMemo(() => {
    if (rightPanel.state === "object") {
      try {
        const {objectNumber, gen} = rightPanel
        const object = currentDocument.getTableEntry(objectNumber, gen)
        const value = object.getValue()
        return (
          <>
            <div>objNumber: {objectNumber} gen:{gen} offset: {object.offset}</div>
            <TopLevelObjectDisplay object={value} key={`${objectNumber}-${gen}`}/>
          </>
        )
      } catch(e) {
        console.log(e)
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
const RightPanel:React.FC = () => {
  return (
    <PanelWrapper>
      <Panel/>
    </PanelWrapper>
  )
}

export default RightPanel