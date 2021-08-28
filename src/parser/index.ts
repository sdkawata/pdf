import { decode } from "./decode"
import { parseIndirectObject, parseObject, PdfDict, PdfStream, PdfTopLevelObject } from "./objectparser"
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

const nullGetter:ValueGetter = (index:number, gen:number) => {throw new Error("try to get value from null getter")}
export class IndirectObject {
  private readonly buf:ArrayBuffer
  public readonly offset:number
  public readonly index: number
  public readonly gen:number
  constructor(buf:ArrayBuffer, index:number, offset:number,gen:number) {
    this.buf = buf
    this.index = index
    this.offset = offset
    this.gen = gen
  }
  getValue(): PdfTopLevelObject {
    return parseIndirectObject(new Reader(this.buf, this.offset))
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
      const {buf} = decode(nullGetter, obj)
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
      result.push(new IndirectObject(this.buf, i, Number(offset), Number(fileGen)))
      // TODO: parse cross ref stream
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
}

export const parse = (buf:ArrayBuffer): PdfDocument => {
  return new PdfDocument(buf)
}