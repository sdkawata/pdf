import { PdfDocument } from "."
import {readFileSync} from "fs"
import {join} from "path"
import { PdfDict } from "./objectparser"

describe('parser', () => {
  const file = readFileSync(join(__dirname, "./fixture/simple.pdf"))
  const document = new PdfDocument(file)
  it('should parse', () => {
    expect(document.header).toBe("%PDF-1.0")
    expect(document.tableOffset).toBe(444)
  })
  it('should return tableEntry', () => {
    const entries = document.tableEntries
    expect(entries.length).toBe(5)
    expect(entries[0].offset).toBe(15)
    expect(entries[1].offset).toBe(74)
    expect(entries[2].offset).toBe(281)
    expect(entries[3].offset).toBe(182)
    expect(entries[4].offset).toBe(394)
  })
  it('should parse all tableEntry', () => {
    const entries = document.tableEntries
    entries[0].getValue()
    entries[1].getValue()
    entries[2].getValue()
    entries[3].getValue()
    entries[4].getValue()
  })
  it('should parse trailer', () => {
    expect(document.trailer).toBeInstanceOf(PdfDict)
    expect(document.trailer.dict.get("Size")).toBe(6)
  })
})


describe('parse PDFv1.6', () => {
  const file = readFileSync(join(__dirname, "./fixture/testPDF_Version.7.x.pdf"))
  const document = new PdfDocument(file)
  it('should parse', () => {
    expect(document.header).toBe("%PDF-1.6")
  })
})