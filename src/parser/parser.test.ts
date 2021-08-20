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
})