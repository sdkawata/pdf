import Encoding from "encoding-japanese"

export const decodeAscii = (buf: ArrayBuffer) =>
  String.fromCharCode.apply("", new Uint8Array(buf))

export const autoDecode = (buf:ArrayBuffer) => {
  try {
    const detected = Encoding.detect(new Uint8Array(buf))
    if (detected !== "UNICODE" &&
      detected !== "UTF16"   &&
      detected !== "UTF16LE" &&
      detected !== "UTF16BE" &&
      detected !== "SJIS" &&
      detected !== "EUCJP"
    ) {
      return decodeAscii(buf)
    }
    const utf16buf = Encoding.convert(new Uint8Array(buf), 'UTF16LE', detected as Encoding.Encoding)
    return String.fromCharCode.apply("", new Uint16Array(new Uint8Array(utf16buf).buffer))
  } catch (e) {
    return decodeAscii(buf)
  }
}