const checkHeader = (reader:Reader) => {
  const headerString = reader.readStringUntilEOL()
  return headerString
  console.log("header", headerString)
}

const checkEof = (reader:Reader) => {
  const eofString = reader.reverseReadStringUntilEOL()
  console.log("eof", eofString)
}

export class Document {
  private buf: ArrayBuffer
  private tableOffset: number
  private header: string
  constructor(buf:ArrayBuffer) {
    const reader = new Reader(buf)
    this.header = checkHeader(reader)
    reader.seekToLast()
    checkEof(reader)
    const tableOffset = Number(reader.reverseReadStringUntilEOL())
    console.log("tableOffset", tableOffset)
    this.buf = buf
    this.tableOffset = tableOffset
  }
  getHeader(): string {
    return this.header
  }
  getTableOffset(): number {
    return this.tableOffset
  }
}

class Reader {
  private buf: ArrayBuffer;
  private current: number = 0;
  private view: Uint8Array
  constructor(buf:ArrayBuffer) {
    this.buf = buf
    this.view = new Uint8Array(buf)
  }
  readStringUntilEOL():string {
    const start = this.current
    while (this.view[this.current] !== 0x0a && this.view[this.current] !== 0x0d) {
      this.current++
    }
    const str = String.fromCharCode.apply("", new Uint8Array(this.buf, start, this.current - start))
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
    const str = String.fromCharCode.apply("", new Uint8Array(this.buf, this.current + 1, start - this.current))
    return str
  }
  seek(ptr:number) {
    this.current = ptr
  }
  seekToLast() {
    this.current = this.buf.byteLength - 1
  }
}




export const parse = async (buf:ArrayBuffer): Promise<Document> => {
  console.log(1)
  return new Document(buf)
}