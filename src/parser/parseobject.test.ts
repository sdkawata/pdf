import {parsePdfObject, PdfArray, PdfDict, PdfName, PdfObject, PdfRef} from "./"

describe("parsePdfObject", () => {
  const parseString = (string) => {
    const buffer = Buffer.from(string)
    return parsePdfObject(buffer, 0)
  }
  const expectToBeName = (object: PdfObject, name: string) => {
    expect(object).toBeInstanceOf(PdfName)
    expect((object as PdfName).name).toBe(name)
  }
  const expectToBeRef = (object: PdfObject, number: number, gen: number) => {
    expect(object).toBeInstanceOf(PdfRef)
    expect((object as PdfRef).objNumber).toBe(number)
    expect((object as PdfRef).gen).toBe(gen)
  }
  it("should parse number", () => {
    expect(parseString("1")).toBe(1)
    expect(parseString("-1")).toBe(-1)
    expect(parseString("12345678")).toBe(12345678)
  })
  it("should parse string", () => {
    expect(parseString("(Hello, World!)")).toBe("Hello, World!")
    expect(parseString('(Some \\ escaped \\(characters)')).toBe("Some \ escaped (characters")
    expect(parseString("(Red (Rouge))")).toBe("Red (Rouge)")
  })
  it("should parse name", () => {
    expectToBeName(parseString("/French "), "French")
    expectToBeName(parseString("/Websafe#20Dark#20Green "), "Websafe Dark Green")
  })
  it("should parse bool", () => {
    expect(parseString("true ")).toBe(true)
    expect(parseString("false ")).toBe(false)
  })
  it("should parse ref", () => {
    expectToBeRef(parseString("6 0 R"), 6, 0)
  })
  it("should parse dict", () => {
    const value = parseString('<</a 1 /b (abc) /c <</d 1 /c 3>> >>')
    expect(value).toBeInstanceOf(PdfDict)
    const dict = (value as PdfDict).dict
    expect(dict['a']).toBe(1)
    expect(dict['b']).toBe("abc")
    expect(dict['c']).toBeInstanceOf(PdfDict)
  })
  it("should parse array", () => {
    const value = parseString('[1 [2 3] (abc)]')
    expect(value).toBeInstanceOf(PdfArray)
    const array = (value as PdfArray).array
    expect(array[0]).toBe(1)
    expect(array[1]).toBeInstanceOf(PdfArray)
    expect(array[2]).toBe("abc")
  })
})