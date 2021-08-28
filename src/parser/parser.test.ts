import { PdfDocument, UncompressedIndirectObject } from "."
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
    expect((entries[0] as UncompressedIndirectObject).offset).toBe(15)
    expect((entries[1] as UncompressedIndirectObject).offset).toBe(74)
    expect((entries[2] as UncompressedIndirectObject).offset).toBe(281)
    expect((entries[3] as UncompressedIndirectObject).offset).toBe(182)
    expect((entries[4] as UncompressedIndirectObject).offset).toBe(394)
  })
  it('should parse all tableEntry', () => {
    const entries = document.tableEntries
    entries[0].getValue(document)
    entries[1].getValue(document)
    entries[2].getValue(document)
    entries[3].getValue(document)
    entries[4].getValue(document)
  })
  it('should parse trailer', () => {
    expect(document.trailer).toBeInstanceOf(Map)
    expect(document.trailer.get("Size")).toBe(6)
  })
})


describe('parse PDFv1.6', () => {
  const file = readFileSync(join(__dirname, "./fixture/testPDF_Version.7.x.pdf"))
  const document = new PdfDocument(file)
  it('should parse', () => {
    expect(document.header).toBe("%PDF-1.6")
  })
  it('should getValue', () => {
    document.tableEntries.forEach((entry) => entry.getValue(document))
  })
})