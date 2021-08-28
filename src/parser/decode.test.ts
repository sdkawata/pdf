import { applyPngPredictor } from "./decode"

const toBuffer = (array: number[]):ArrayBuffer => new Uint8Array(array).buffer

describe("applyPngPredictor", () => {
  it("should decode preditor 0", () => {
    const result = applyPngPredictor(2, toBuffer([0,1,2]))
    const view = new Uint8Array(result)
    expect(result.byteLength).toBe(2)
    expect(view[0]).toBe(1)
    expect(view[1]).toBe(2)
  })
  it("should decode multi column", () => {
    const result = applyPngPredictor(2, toBuffer([0,1,2,0,3,4]))
    const view = new Uint8Array(result)
    expect(result.byteLength).toBe(4)
    expect(view[0]).toBe(1)
    expect(view[1]).toBe(2)
    expect(view[2]).toBe(3)
    expect(view[3]).toBe(4)
  })
  it("should decode predictor 2", () => {
    const result = applyPngPredictor(2, toBuffer([0,1,2,2,3,255]))
    const view = new Uint8Array(result)
    expect(result.byteLength).toBe(4)
    expect(view[0]).toBe(1)
    expect(view[1]).toBe(2)
    expect(view[2]).toBe(4)
    expect(view[3]).toBe(1)
  })
})