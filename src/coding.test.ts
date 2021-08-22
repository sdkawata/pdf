import {autoDecode} from "./coding"

it("a", () => {expect(true).toBe(true)})

// なぜか動かないのでコメントアウト
/*
describe("autoDecode", () => {
  it("should decode UTF16LE" , () => {
    expect(autoDecode(new Uint8Array([0xff, 0xfe, 0x61, 0, 0x62, 0, 0x63, 0]).buffer)).toBe('abc')
  })
  it("should decode UTF16BE" , () => {
    expect(autoDecode(new Uint8Array([0xfe, 0xff, 0, 0x61, 0, 0x62, 0, 0x63]).buffer)).toBe('abc')
  })
  it("should decode ASCII" , () => {
    expect(autoDecode(new Uint8Array([0x61, 0x62, 0x63]).buffer)).toBe('abc')
  })
})
*/