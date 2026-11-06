import { BrowserCodeReader } from "@zxing/browser";
import {
  BarcodeFormat, ChecksumException, Code128Reader, DecodeHintType, FormatException, NotFoundException,
  OneDReader, QRCodeReader, type BitArray, type Result
} from "@zxing/library";
import MultiFormatUPCEANReader from "@zxing/library/esm/core/oned/MultiFormatUPCEANReader";

const hints = new Map([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]]
]);

const decodeMiss = (error: unknown) => error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException;

class RetailLineReader extends OneDReader {
  private readonly ean = new MultiFormatUPCEANReader(hints);
  private readonly code128 = new Code128Reader();

  decodeRow(rowNumber: number, row: BitArray, scanHints?: Map<DecodeHintType, unknown>): Result {
    try {
      return this.ean.decodeRow(rowNumber, row, scanHints);
    } catch (error) {
      if (!decodeMiss(error)) throw error;
      return this.code128.decodeRow(rowNumber, row, scanHints);
    }
  }

  reset() {
    this.ean.reset();
    this.code128.reset();
  }
}

export function createRetailReader() {
  const retail = new RetailLineReader();
  const qr = new QRCodeReader();
  const scanHints = new Map<DecodeHintType, unknown>(hints);
  scanHints.set(DecodeHintType.TRY_HARDER, true);
  const reader = new BrowserCodeReader({
    decode(image, hints) {
      for (const decoder of [qr, retail]) {
        try {
          return decoder.decode(image, hints ?? undefined);
        } catch (error) {
          if (!decodeMiss(error)) throw error;
        }
      }
      throw new NotFoundException();
    },
    reset() {
      retail.reset();
      qr.reset();
    }
  }, scanHints, { delayBetweenScanAttempts: 180, delayBetweenScanSuccess: 450 });
  return { reader, BarcodeFormat };
}
