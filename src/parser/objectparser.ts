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
  public readonly dict: {readonly [k:string]:PdfObject}
  constructor(dict: {readonly [k:string]:PdfObject}) {
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
  getValue(): ArrayBuffer {
    const length = this.dict.dict["Length"] as number
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

export type PdfObject = boolean | number | string | PdfName | null | PdfArray | PdfDict | PdfRef

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

const parseString = (reader:Reader): string => {
  let str = ""
  let parentheses = 0
  reader.readOne()
  while (reader.peekChar() !== ")" || parentheses !== 0) {
    const char = reader.readChar()
    if (char === "\\") {
      str += reader.readChar()
    } else if (char === "(") {
      parentheses+=1
      str += char
    } else if (char === ")") {
      parentheses-=1
      str += char
    } else {
      str += char
    }
  }
  reader.readOne()
  return str
}

const isDelimiter  = (n:number) => 
  n === 0x20 || // space
  n === 0x0d || //cr
  n === 0x0a || //lf
  n === 0x2f || // /
  n === 0x3c || // <
  n === 0x3e || // >
  n === 0x5b    // [
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

const parseDict = (reader: Reader): PdfDict => {
  if (reader.readChar() !== '<') {
    throw new Error('unexpected token expect <')
  }
  if (reader.readChar() !== '<') {
    throw new Error('unexpected token expect <')
  }
  const dict = {}
  reader.skipSpace()
  while(reader.peekChar() !== '>') {
    const name = parseName(reader)
    reader.skipSpace()
    const value = parseObject(reader)
    reader.skipSpace()
    dict[name.name] = value
  }
  if (reader.readChar() !== '>') {
    throw new Error('unexpected token expect >')
  }
  if (reader.readChar() !== '>') {
    throw new Error('unexpected token expect >')
  }
  return new PdfDict(dict)
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
  if (isDigit(peeked) || peeked === 0x2d) {
    return tryParseNumberOrRef(reader)
  } else if (peeked === 0x28) {
    return parseString(reader)
  } else if (peeked === 0x2f) {
    return parseName(reader)
  } else if (peeked === 0x74 || peeked === 0x66) {
    return parseBool(reader)
  } else if (peeked === 0x3c) {
    return parseDict(reader)
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
  reader.skipSpace()
  // object number
  parseNumber(reader)
  reader.skipSpace()
  // generation
  parseNumber(reader)
  reader.skipSpace()
  const str = readUntilDelimiter(reader)
  if (str !== "obj") {
    throw new Error("unexpected string expected obj")
  }
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
