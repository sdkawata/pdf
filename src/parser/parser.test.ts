import { Document } from "."
import {readFileSync} from "fs"
import {join} from "path"

describe('parser', () => {
  const file = readFileSync(join(__dirname, "./fixture/simple.pdf"))
  const document = new Document(file)
  const view = new Uint8Array(file)
  it('should parse', () => {
    expect(document.getHeader()).toBe("%PDF-1.0")
    expect(document.getTableOffset()).toBe(444)
  })
  it('should return tableEntry', () => {
    const entries = document.getTableEntries()
    expect(entries.length).toBe(6)
    expect(entries[0]).toBe(null)
    expect(entries[1].offset).toBe(15)
    expect(entries[2].offset).toBe(74)
    expect(entries[3].offset).toBe(281)
    expect(entries[4].offset).toBe(182)
    expect(entries[5].offset).toBe(394)
  })
})