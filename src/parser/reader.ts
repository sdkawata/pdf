export const bufToString = (buf: ArrayBuffer, start:number, length:number): string => {
  return String.fromCharCode.apply("", new Uint8Array(buf.slice(start, start + length)))
}

export class Reader {
  public readonly buf: ArrayBuffer;
  private current: number = 0;
  private readonly view: Uint8Array
  constructor(buf:ArrayBuffer, offset:number = 0) {
    this.buf = buf
    this.current = offset
    this.view = new Uint8Array(buf)
  }
  readLine():string {
    const start = this.current
    while (this.peek() !== 0x0a && this.peek() !== 0x0d) {
      this.current++
    }
    const str = bufToString(this.buf, start, this.current - start)
    this.skipEOL()
    return str
  }
  // > The carriage return (CR) and line feed (LF) characters, alos called newline characters, are treated as end-of-line(EOL) markers.
  // > The combination of a carriage return followed by immediately by a line feed is treated as one EOL marker.
  skipEOL():void {
    if (this.peek() === 0x0d && this.peek(1) === 0x0a) {
      this.current+=2
    } else if (this.peek() === 0x0a) {
      this.current++
    } else if (this.peek() === 0x0d) {
      this.current++
    }
  }
  reverseSkipEOL():void {
    if (this.peek() === 0x0a && this.peek(-1) === 0x0d) {
      this.current-=2
    } else if (this.peek() === 0x0a) {
      this.current--
    } else if (this.peek() === 0x0d) {
      this.current--
    }
  }
  reverseReadStringUntilEOL():string {
    this.reverseSkipEOL()
    const start = this.current
    while (this.peek() !== 0x0a && this.peek() !== 0x0d) {
      this.current--
    }
    const str = bufToString(this.buf, this.current + 1, start - this.current)
    return str
  }
  seek(ptr:number) {
    this.current = ptr
  }
  advance(offset:number) {
    this.current += offset
  }
  seekToLast() {
    this.current = this.buf.byteLength - 1
  }
  pos():number {
    return this.current
  }
  skipSpace() {
    while(
      (
      this.peek() === 0x0a ||
      this.peek() === 0x0d ||
      this.peek() === 0x20
      ) && this.current < this.buf.byteLength
    ) {
      this.current++
    }
  }
  outOfBounds(offset:number = 0) {
    return this.current+offset >= this.buf.byteLength;
  }
  peek(offset:number = 0): number {
    if (this.outOfBounds(offset)) {
      throw new Error("out of bounds")
    }
    return this.view[this.current+offset]
  }
  peekChar(offset:number = 0): string {
    return String.fromCharCode(this.peek(offset))
  }
  readOne(): number {
    const result = this.peek()
    this.current++
    return result
  }
  readChar(): string {
    return String.fromCharCode(this.readOne())
  }
  readBytesBE(n:number): number {
    let result = 0
    for(let i=0;i<n;i++) {
      result = result * 256 + this.readOne()
    }
    return result
  }
}