import Pako from "pako"
import { PdfArray, PdfDict, PdfName, PdfObject, PdfStream } from "./objectparser"
import { ValueGetter } from "./types"

export const applyPngPredictor = (columns: number, buf:ArrayBuffer):ArrayBuffer => {
  const rows = buf.byteLength / (columns+1)
  const predicted = new ArrayBuffer(rows * columns)
  const input = new Uint8Array(buf)
  const output = new Uint8Array(predicted)
  for (let i=0;i<rows;i++) {
    const algo = input[i*(columns+1)]
    for(let j =0;j<columns;j++) {
      const idx = i * (columns + 1) + j + 1
      if (algo === 0 || i===0) {
        output[i*(columns)+j] = input[idx]
      } else if (algo === 2) {
        if (i !== 0) {
          output[i*(columns)+j] = (input[idx] + output[(i-1)*columns + j]) % 256
        }
      } else if (algo === 1){
        if (j !== 0) {
          output[i*(columns)+j] = (input[idx] + output[i*columns + j-1]) % 256
        }
      } else {
        throw new Error("unknwon predictor :" + algo)
      }
    }
  }
  return predicted
}

export const decode = (getter: ValueGetter, stream: PdfStream): {algo: string, buf: ArrayBuffer} => {
  const buffer = stream.getValue(getter)
  const filter = stream.dict.dict.get('Filter')
  if (filter && (
    (filter instanceof PdfName && filter.name === "FlateDecode") ||
    (filter instanceof PdfArray && filter.array.length === 1 && filter.array[0] instanceof PdfName && filter.array[0].name === "FlateDecode")
  )) {
    try {
      const deflated = Pako.inflate(new Uint8Array(buffer))
      // predictor
      if (stream.dict.dict.get('DecodeParms')) {
        const params = stream.dict.dict.get('DecodeParms')
        if (! (params instanceof PdfDict)) {
          throw new Error("decode params is not dict")
        }
        if (params.dict.get('Predictor')) {
          const predictor = params.dict.get('Predictor')
          if (typeof predictor !== "number") {
            throw new Error("predictor not number")
          }
          if (predictor !== 0) {
            let columns = 1
            if (params.dict.get("Columns")) {
              columns = params.dict.get("Columns") as number
            }
            const result = applyPngPredictor(columns, deflated)
            return {
              algo: "deflate",
              buf: result,
            }
          }
        }
      }
      return {
        algo: "deflate",
        buf: deflated,
      }
    } catch (e) {
      throw e
    }
  } else {
    return {
      algo: "raw",
      buf: buffer
    }
  }
}