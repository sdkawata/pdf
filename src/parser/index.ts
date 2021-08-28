import { decode } from "./decode"
import { parseIndirectObject, parseIndirectObjectHeader, parseObject, PdfArray, PdfDict, PdfStream, PdfTopLevelObject } from "./objectparser"
import {bufToString, Reader} from "./reader"
import { ValueGetter } from "./types"


const checkHeader = (reader:Reader) => {
  const headerString = reader.readLine()
  return headerString
}

const checkEof = (reader:Reader) => {
  const eofString = reader.reverseReadStringUntilEOL()
  if (eofString !== "%%EOF") {
    throw new Error("EOF string not found")
  }
}

export const nullGetter:ValueGetter = (index:number, gen:number) => {throw new Error("try to get value from null getter")}
export interface IndirectObject {
  readonly objNumber: number
  readonly gen: number
  getValue(document: PdfDocument): PdfTopLevelObject
}
export class UncompressedIndirectObject implements IndirectObject{
  private readonly buf:ArrayBuffer
  public readonly objNumber:number
  public readonly gen:number
  public readonly offset:number
  private value: PdfTopLevelObject | undefined
  constructor(buf:ArrayBuffer, objNumber:number, offset:number,gen:number) {
    this.buf = buf
    this.objNumber = objNumber
    this.offset = offset
    this.gen = gen
  }
  getValue(document: PdfDocument): PdfTopLevelObject {
    console.log(this)
    if (this.value) {
      return this.value
    }
    return this.value = parseIndirectObject(new Reader(this.buf, this.offset))
  }
}

export class CompressedIndirectObject implements IndirectObject {
  public readonly objNumber:number
  public readonly gen:number
  public readonly outerObjNumber:number
  private value: PdfTopLevelObject | undefined
  constructor(objNumber:number, gen:number, outerObjNumber: number) {
    this.objNumber = objNumber
    this.outerObjNumber = outerObjNumber
    this.gen = gen
  }
  getValue(document: PdfDocument): PdfTopLevelObject {
    if (this.value) {
      return this.value
    }
    throw new Error("unimplemented")
    /*
    const outerObjValue = document.getObject(this.outerObjNumber, 0).getValue(document)
    if (! (outerObjValue instanceof PdfStream)) {
      throw new Error("outer object not stream")
    }
    const decoded = outerObjValue.getDecoded().buf
    const reader = new Reader(decoded)
    const line = reader.readLine()
    */
  }
}


export class PdfDocument {
  private readonly buf: ArrayBuffer
  public readonly tableOffset: number
  public readonly tableEntryOffset: number
  public readonly header: string
  public readonly trailer: PdfDict
  public readonly tableEntries: IndirectObject[]
  constructor(buf:ArrayBuffer) {
    this.buf = buf
    const reader = new Reader(buf)
    this.header = checkHeader(reader)
    reader.seekToLast()
    checkEof(reader)
    const tableOffset = Number(reader.reverseReadStringUntilEOL())

    // parse cross-reference table
    this.tableOffset = tableOffset
    reader.seek(this.tableOffset)
    const xref = reader.readLine()
    if (xref === "xref") {
      this.tableEntries = this.parseCrossRefTable(reader)
      this.trailer = this.parseTrailer(reader)
    } else {
      reader.seek(this.tableOffset)
      const obj = parseIndirectObject(reader)
      if (! (obj instanceof PdfStream)) {
        throw new Error("invalid cross ref table: not stream")
      }
      this.trailer = obj.dict
      const {buf:crossRefBuf} = decode(nullGetter, obj)
      if (! obj.dict.dict.get("W")) {
        throw new Error("cross reference stream do not contain W param")
      }
      if (! (obj.dict.dict.get("W") instanceof PdfArray)) {
        throw new Error("W param is not pdf array")
      }
      const wArray = (obj.dict.dict.get("W") as PdfArray).array
      if (! wArray.every((v) => typeof v === "number")) {
        throw new Error("W contains non-number element")
      }
      const w = wArray as number[]
      if (w.length !== 3) {
        throw new Error("invalid W length:" + w.length)
      }
      const size = obj.dict.dict.get("Index") as number
      const index = (obj.dict.dict.get("Index") as PdfArray).array as number[] || [0, size] 
      const crossRefReader = new Reader(crossRefBuf)
      const tableEntries: IndirectObject[] = []
      let currentIndex = index[0]
      while(! crossRefReader.outOfBounds()) {
        const type = w[0] > 0 ? crossRefReader.readBytesBE(w[0]) : 1
        const f1 = w[1] > 0 ? crossRefReader.readBytesBE(w[1]) : 0
        const f2 = w[2] > 0 ? crossRefReader.readBytesBE(w[2]) : -1
        if (type === 1) {
          reader.seek(f1)
          const {objNumber,gen} = parseIndirectObjectHeader(reader)
          if (objNumber != currentIndex) {
            throw new Error("unexpected number expect:" + currentIndex + " got:" + objNumber)
          }
          tableEntries.push(new UncompressedIndirectObject(this.buf, objNumber, f1, gen))
        } else if (type === 2) {
          tableEntries.push(new CompressedIndirectObject(currentIndex, 0, f1))
        } else if (type === 0) {
          // free object skip
        } else {
          throw new Error("invalid type in cross ref stream:" + type)
        }
        currentIndex++
      }
      this.tableEntries = tableEntries
    }
  }

  parseCrossRefTable(reader:Reader): IndirectObject[] {
    const tableHeader = reader.readLine()
    const [indexOffsetStr, tableLengthStr] = tableHeader.split(" ")
    const indexOffset = Number(indexOffsetStr)
    const tableLength = Number(tableLengthStr)
    if (indexOffset !== 0) {
      throw new Error('indexOffset:' + indexOffset + ' not 0')
    }
    const startPos = reader.pos()
    reader.readLine()
    const endPos = reader.pos()
    const entryLength = endPos - startPos
    const result: IndirectObject[] = []
    for (let i=1;i<tableLength;i++) {
      reader.seek(startPos + entryLength * i)
      const line = bufToString(this.buf, startPos + entryLength * i, entryLength)
      const [offset, fileGen] = line.split(" ")
      result.push(new UncompressedIndirectObject(this.buf, i, Number(offset), Number(fileGen)))
    }
    return result
  }

  parseTrailer(reader:Reader): PdfDict {
    reader.seekToLast()
    while(true) {
      reader.reverseSkipEOL()
      const str = reader.reverseReadStringUntilEOL()
      if (str === "trailer") {
        break
      }
    }
    reader.advance(1)
    reader.readLine()
    reader.skipEOL()
    const trailer = parseObject(reader)
    if (trailer instanceof PdfDict) {
      return trailer
    } else {
      throw new Error("trailer is not dict")
    }
  }

  getObject(objNumber:number, gen:number = 0): IndirectObject | undefined {
    return this.tableEntries.find((obj) => obj.objNumber === objNumber && obj.gen === gen)
  }
}

export const parse = (buf:ArrayBuffer): PdfDocument => {
  return new PdfDocument(buf)
}