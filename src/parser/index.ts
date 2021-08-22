import { parseIndirectObject, parseObject, PdfDict, PdfTopLevelObject } from "./objectparser"
import {bufToString, Reader} from "./reader"


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

export class Document {
  private readonly buf: ArrayBuffer
  public readonly tableOffset: number
  public readonly tableEntryOffset: number
  public readonly header: string
  public readonly indexOffset: number
  public readonly tableLength: number
  public readonly tableEntryLength: number
  public readonly trailer: PdfDict
  constructor(buf:ArrayBuffer) {
    this.buf = buf
    const reader = new Reader(buf)
    this.header = checkHeader(reader)
    reader.seekToLast()
    checkEof(reader)
    const tableOffset = Number(reader.reverseReadStringUntilEOL())

    // find trailer
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
      this.trailer = trailer
    } else {
      throw new Error("trailer is not dict")
    }

    // parse cross-reference table
    this.tableOffset = tableOffset
    reader.seek(this.tableOffset)
    reader.readLine() // skip xref
    const tableHeader = reader.readLine()
    const [indexOffset, tableLength] = tableHeader.split(" ")
    this.indexOffset = Number(indexOffset)
    if (this.indexOffset !== 0) {
      throw new Error('indexOffset:' + this.indexOffset + ' not 0')
    }
    this.tableLength = Number(tableLength)
    const startPos = this.tableEntryOffset = reader.pos()
    reader.readLine()
    const endPos = reader.pos()
    this.tableEntryLength = endPos - startPos
  }
  getHeader(): string {
    return this.header
  }
  getTableOffset(): number {
    return this.tableOffset
  }
  getTableEntry(index: number): IndirectObject | null {
    if (index === 0) {
      return null
    }
    const line = bufToString(this.buf, this.tableEntryOffset + index * this.tableEntryLength, this.tableEntryLength)
    const [offset, gen] = line.split(" ")
    return new IndirectObject(this.buf, index, Number(offset), Number(gen))
  }
  getTableEntries(): (IndirectObject | null)[] {
    return [...Array(this.tableLength).keys()].map((k) => this.getTableEntry(k))
  }
}

export const parse = async (buf:ArrayBuffer): Promise<Document> => {
  return new Document(buf)
}