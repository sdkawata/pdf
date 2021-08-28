import Pako from "pako"
import { PdfDocument } from "."
import { PdfName, PdfStream } from "./objectparser"

export type DecodeResult = {
  algo: string,
  buf: ArrayBuffer,
}

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

export const decode = (document: PdfDocument | undefined, stream: PdfStream): DecodeResult => {
  const buffer = stream.getValue(document)
  const filter = stream.dict.get('Filter')
  if (filter && (
    (filter instanceof PdfName && filter.name === "FlateDecode") ||
    (Array.isArray(filter) && filter.length === 1 && filter[0] instanceof PdfName && filter[0].name === "FlateDecode")
  )) {
    try {
      const deflated = Pako.inflate(new Uint8Array(buffer))
      // predictor
      if (stream.dict.get('DecodeParms')) {
        const params = stream.dict.get('DecodeParms')
        if (! (params instanceof Map)) {
          throw new Error("decode params is not dict")
        }
        if (params.get('Predictor')) {
          const predictor = params.get('Predictor')
          if (typeof predictor !== "number") {
            throw new Error("predictor not number")
          }
          if (predictor !== 0) {
            let columns = 1
            if (params.get("Columns")) {
              columns = params.get("Columns") as number
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