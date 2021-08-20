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

const bufToString = (buf: ArrayBuffer, start:number, length:number): string => {
  return String.fromCharCode.apply("", new Uint8Array(buf.slice(start, start + length)))
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
    console.log("tableOffset", tableOffset)
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

class Reader {
  private buf: ArrayBuffer;
  private current: number = 0;
  private view: Uint8Array
  constructor(buf:ArrayBuffer, offset:number = 0) {
    this.buf = buf
    this.current = offset
    this.view = new Uint8Array(buf)
  }
  readLine():string {
    const start = this.current
    while (this.view[this.current] !== 0x0a && this.view[this.current] !== 0x0d) {
      this.current++
    }
    const str = bufToString(this.buf, start, this.current - start)
    // TODO: CRLF
    this.current++
    return str
  }
  // > The carriage return (CR) and line feed (LF) characters, alos called newline characters, are treated as end-of-line(EOL) markers.
  // > The combination of a carriage return followed by immediately by a line feed is treated as one EOL marker.
  reverseSkipEOL():void {
    if (this.view[this.current] === 0x0a) {
      this.current--
    } else if (this.view[this.current] === 0x0d) {
      this.current--
    }
    //TODO CRLF
  }
  reverseReadStringUntilEOL():string {
    this.reverseSkipEOL()
    const start = this.current
    while (this.view[this.current] !== 0x0a && this.view[this.current] !== 0x0d) {
      this.current--
    }
    const str = bufToString(this.buf, this.current + 1, start - this.current)
    return str
  }
  seek(ptr:number) {
    this.current = ptr
  }
  seekToLast() {
    this.current = this.buf.byteLength - 1
  }
  pos():number {
    return this.current
  }
}




export const parse = async (buf:ArrayBuffer): Promise<Document> => {
  console.log(1)
  return new Document(buf)
}