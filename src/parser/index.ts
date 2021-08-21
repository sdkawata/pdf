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
export class TableEntry {
  private readonly buf:ArrayBuffer
  public readonly offset:number
  public readonly gen:number
  constructor(buf:ArrayBuffer, offset:number,gen:number) {
    this.buf = buf
    this.offset = offset
    this.gen = gen
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
  constructor(buf:ArrayBuffer) {
    const reader = new Reader(buf)
    this.header = checkHeader(reader)
    reader.seekToLast()
    checkEof(reader)
    const tableOffset = Number(reader.reverseReadStringUntilEOL())
    this.buf = buf
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
  getTableEntry(index: number): TableEntry | null {
    if (index === 0) {
      return null
    }
    const line = bufToString(this.buf, this.tableEntryOffset + index * this.tableEntryLength, this.tableEntryLength)
    const [offset, gen] = line.split(" ")
    return new TableEntry(this.buf, Number(offset), Number(gen))
  }
  getTableEntries(): (TableEntry | null)[] {
    return [...Array(this.tableLength).keys()].map((k) => this.getTableEntry(k))
  }
}





export const parse = async (buf:ArrayBuffer): Promise<Document> => {
  console.log(1)
  return new Document(buf)
}