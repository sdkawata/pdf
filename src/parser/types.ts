import { PdfTopLevelObject } from "./objectparser";

export type ValueGetter = (objNumber: number, gen: number) => PdfTopLevelObject