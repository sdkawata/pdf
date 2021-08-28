import { Reader } from "./reader"

export class PdfName {
  public readonly name: string
  constructor(name: string) {
    this.name = name
  }
}

export class PdfArray {
  public readonly array: readonly PdfObject[]
  constructor(array: PdfObject[]){
    this.array = array
  }
}

export class PdfDict {
  public readonly dict: ReadonlyMap<string, PdfObject>
  constructor(dict: Map<string, PdfObject>) {
    this.dict = dict
  }
}

export class PdfStream {
  private readonly buf: ArrayBuffer
  public readonly offset:number
  public readonly dict: PdfDict
  constructor(buf: ArrayBuffer, offset: number, dict: PdfDict) {
    this.buf = buf
    this.offset = offset
    this.dict = dict
  }
  getLength(getter?:(objNumber:number, gen:number) => PdfTopLevelObject): number {
    const length = this.dict.dict.get("Length")
    if (length instanceof PdfRef) {
      if (getter) {
        const value = getter(length.objNumber, length.gen)
        if (typeof value === "number") {
          return value
        } else {
          throw new Error("illegal length type")
        }
      } else {
        throw new Error("length is ref and document not given")
      }
    } else if (typeof length === "number") {
      return length
    } else {
      throw new Error("illegal length type")
    }
  }
  getValue(getter?:(objNumber:number, gen:number) => PdfTopLevelObject): ArrayBuffer {
    const length = this.getLength(getter)
    return this.buf.slice(this.offset, this.offset + length)
  }
}
export class PdfRef {
  public readonly objNumber:number
  public readonly gen: number
  constructor(objNumber: number, gen:number) {
    this.objNumber = objNumber
    this.gen = gen
  }
}

export type PdfTopLevelObject = PdfObject | PdfStream

export type PdfObject = boolean | number | ArrayBuffer | PdfName | null | PdfArray | PdfDict | PdfRef

const isDigit = (i:number) => i >= 0x30 && i <= 0x39

const parseNumber = (reader:Reader): number => {
  let str = String.fromCharCode(reader.readOne())
  while (!reader.outOfBounds()  && (isDigit(reader.peek()) || reader.peek() === 0x2e)) {
    str += String.fromCharCode(reader.readOne())
  }
  return Number(str)
}

const tryParseNumberOrRef = (reader:Reader): PdfRef | number => {
  const number = parseNumber(reader)
  const start = reader.pos()
  if (reader.outOfBounds() || reader.readChar() !== ' ') {
    reader.seek(start)
    return number
  }
  if (!isDigit(reader.peek())) {
    reader.seek(start)
    return number
  }
  const second = parseNumber(reader)
  if (reader.readChar() !== ' ') {
    reader.seek(start)
    return number
  }
  if (reader.readChar() !== 'R') {
    reader.seek(start)
    return number
  }
  return new PdfRef(number, second)
}

const parseString = (reader:Reader): ArrayBuffer => {
  let result = []
  let parentheses = 0
  reader.readOne()
  while (reader.peekChar() !== ")" || parentheses !== 0) {
    const cp = reader.readOne()
    const char = String.fromCharCode(cp)
    if (char === "\\") {
      result.push(reader.readOne())
    } else if (char === "(") {
      parentheses+=1
      result.push(cp)
    } else if (char === ")") {
      parentheses-=1
      result.push(cp)
    } else {
      result.push(cp)
    }
  }
  reader.readOne()
  return new Uint8Array(result).buffer
}

const isDelimiter  = (n:number) => 
  n === 0x20 || // space
  n === 0x0d || //cr
  n === 0x0a || //lf
  n === 0x2f || // /
  n === 0x3c || // <
  n === 0x3e || // >
  n === 0x28 || // (
  n === 0x29 || // )
  n === 0x5b || // [
  n === 0x5d    // ]
const parseName = (reader:Reader): PdfName => {
  let str = ""
  reader.readOne()
  while (!isDelimiter(reader.peek())) {
    const char = reader.readChar()
    if (char === "#") {
      const hex = reader.readChar() + reader.readChar()
      str += String.fromCharCode(Number("0x" + hex))
    } else {
      str += char
    }
  }
  return new PdfName(str)
}
const parseBool = (reader:Reader): boolean => {
  const str = readUntilDelimiter(reader)
  if (str === "true") {
    return true
  } else if (str === "false") {
    return false
  } else {
    throw new Error("unprocessable value " + str )
  }
}

const parseNull = (reader:Reader): null => {
  const str = readUntilDelimiter(reader)
  if (str === "null") {
    return null
  } else {
    throw new Error("unprocessable value " + str )
  }
}

const parseDict = (reader: Reader): PdfDict => {
  if (reader.readChar() !== '<') {
    throw new Error('unexpected token expect <')
  }
  if (reader.readChar() !== '<') {
    throw new Error('unexpected token expect <')
  }
  const dict = new Map<string, PdfObject>()
  reader.skipSpace()
  while(reader.peekChar() !== '>') {
    const name = parseName(reader)
    reader.skipSpace()
    const value = parseObject(reader)
    reader.skipSpace()
    dict.set(name.name, value)
  }
  if (reader.readChar() !== '>') {
    throw new Error('unexpected token expect >')
  }
  if (reader.readChar() !== '>') {
    throw new Error('unexpected token expect >')
  }
  return new PdfDict(dict)
}


const parseHexString = (reader:Reader): ArrayBuffer => {
  let result = []
  reader.readOne()
  while (!reader.outOfBounds() && reader.peekChar() !== ">") {
    const char = reader.readChar()
    const char2 = reader.readChar()
    result.push(Number('0x' + char + char2))
  }
  reader.readOne()
  return new Uint8Array(result).buffer
}

const parseArray = (reader: Reader): PdfArray => {
  if (reader.readChar() !== '[') {
    throw new Error('unexpected token expect [')
  }
  const array = []
  reader.skipSpace()
  while(reader.peekChar() !== ']') {
    const value = parseObject(reader)
    reader.skipSpace()
    array.push(value)
  }
  if (reader.readChar() !== ']') {
    throw new Error('unexpected token expect ]')
  }
  return new PdfArray(array)
}

export const parseObject = (reader:Reader):PdfObject => {
  reader.skipSpace()
  const peeked = reader.peek()
  if (isDigit(peeked) || peeked === 0x2d || peeked === 0x2e) {
    return tryParseNumberOrRef(reader)
  } else if (peeked === 0x28) {
    return parseString(reader)
  } else if (peeked === 0x2f) {
    return parseName(reader)
  } else if (peeked === 0x74 || peeked === 0x66) {
    return parseBool(reader)
  } else if (peeked === 0x6e) {
    return parseNull(reader)
  } else if (peeked === 0x3c) {
    if (reader.peek(1) === 0x3c) {
      return parseDict(reader)
    } else {
      return parseHexString(reader)
    }
  } else if (peeked === 0x5b) {
    return parseArray(reader)
  }
  throw Error(`cannot parse unexpected ${String.fromCharCode(peeked)} (${peeked}) at offset ${reader.pos()}`)
}
const readUntilDelimiter = (reader:Reader): string => {
  let str = ""
  while (!reader.outOfBounds() && !isDelimiter(reader.peek())) {
    const char = reader.readChar()
    str += char
  }
  return str
}
export const parseIndirectObject = (reader:Reader): PdfTopLevelObject => {
  parseIndirectObjectHeader(reader)
  const result = parseObject(reader)
  if (result instanceof PdfDict) {
    const start = reader.pos()
    reader.skipSpace()
    const str = readUntilDelimiter(reader)
    if (str === "stream") {
      reader.skipEOL()
      return new PdfStream(reader.buf, reader.pos(), result)
    } else {
      reader.seek(start)
      return result
    }
  }
  return result
}

export const parseIndirectObjectHeader = (reader:Reader): {objNumber: number, gen:number} => {
  reader.skipSpace()
  // object number
  const objNumber = parseNumber(reader)
  reader.skipSpace()
  // generation
  const gen = parseNumber(reader)
  reader.skipSpace()
  const str = readUntilDelimiter(reader)
  if (str !== "obj") {
    throw new Error("unexpected string expected obj")
  }
  return {objNumber, gen}
}