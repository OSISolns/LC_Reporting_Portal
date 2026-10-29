import dicomParser from 'dicom-parser';

/**
 * Checks if a file or URL represents a DICOM object.
 */
export function isDicomFile(fileName = '', fileType = '', src = '') {
  const name = String(fileName || '').toLowerCase();
  const type = String(fileType || '').toLowerCase();
  const s = String(src || '').toLowerCase();

  return (
    name.endsWith('.dcm') ||
    name.endsWith('.dicom') ||
    type === 'application/dicom' ||
    type.includes('dicom') ||
    s.includes('.dcm') ||
    s.startsWith('data:application/dicom')
  );
}

/**
 * Converts a base64 string or ArrayBuffer/Uint8Array to a Uint8Array.
 */
export function toUint8Array(input) {
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof input === 'string') {
    let clean = input.trim();
    if (clean.includes('base64,')) {
      clean = clean.split('base64,')[1];
    }
    const binary = atob(clean);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  throw new Error('Unsupported DICOM input type.');
}

/**
 * Parses a DICOM file and renders it to a viewable Data URL (JPEG or PNG),
 * along with extracted clinical/imaging metadata.
 *
 * @param {Uint8Array|ArrayBuffer|string} input Base64 or byte array
 * @returns {Promise<{ dataUrl: string, metadata: object, width: number, height: number }>}
 */
export async function renderDicomToDataUrl(input) {
  const bytes = toUint8Array(input);
  const dataSet = dicomParser.parseDicom(bytes);

  const rows = dataSet.uint16('x00280010') || 512;
  const cols = dataSet.uint16('x00280011') || 512;
  const bitsAllocated = dataSet.uint16('x00280100') || 16;
  const bitsStored = dataSet.uint16('x00280101') || bitsAllocated;
  const pixelRepresentation = dataSet.uint16('x00280103') || 0; // 0 = unsigned, 1 = 2's complement
  const photometricInterpretation = (dataSet.string('x00280004') || 'MONOCHROME2').trim();
  const samplesPerPixel = dataSet.uint16('x00280002') || 1;

  // Windowing / Rescale values
  const windowCenterRaw = dataSet.string('x00281050');
  const windowWidthRaw = dataSet.string('x00281051');
  const rescaleIntercept = parseFloat(dataSet.string('x00281052') || '0') || 0;
  const rescaleSlope = parseFloat(dataSet.string('x00281053') || '1') || 1;

  let windowCenter = windowCenterRaw ? parseFloat(windowCenterRaw.split('\\')[0]) : null;
  let windowWidth = windowWidthRaw ? parseFloat(windowWidthRaw.split('\\')[0]) : null;

  // Physical Pixel Spacing & Calibration
  // (0028,0030) Pixel Spacing = [row spacing, column spacing] in mm
  // (0018,1164) Imager Pixel Spacing = [row spacing, column spacing] in mm
  const pixelSpacingRaw = dataSet.string('x00280030') || dataSet.string('x00181164');
  let rowSpacing = null;
  let colSpacing = null;
  if (pixelSpacingRaw) {
    const parts = pixelSpacingRaw.split('\\').map((p) => parseFloat(p.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) && parts[0] > 0 && parts[1] > 0) {
      rowSpacing = parts[0];
      colSpacing = parts[1];
    } else if (parts.length === 1 && !isNaN(parts[0]) && parts[0] > 0) {
      rowSpacing = parts[0];
      colSpacing = parts[0];
    }
  }

  const sliceThickness = parseFloat(dataSet.string('x00180050') || '0') || null;

  const metadata = {
    patientName: dataSet.string('x00100010') || 'Unknown',
    patientId: dataSet.string('x00100020') || '',
    modality: dataSet.string('x00080060') || '',
    studyDate: dataSet.string('x00080020') || '',
    seriesDescription: dataSet.string('x0008103e') || '',
    institutionName: dataSet.string('x00080080') || '',
    transferSyntaxUid: dataSet.string('x00020010') || '',
    rows,
    cols,
    bitsAllocated,
    bitsStored,
    photometricInterpretation,
    windowCenter,
    windowWidth,
    rowSpacing,
    colSpacing,
    pixelSpacing: (rowSpacing && colSpacing) ? { row: rowSpacing, col: colSpacing } : null,
    sliceThickness,
  };

  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error('DICOM file contains no pixel data (x7fe00010).');
  }

  // 1. Check for Encapsulated (Compressed JPEG / JPEG2000) fragments
  if (pixelDataElement.encapsulated) {
    try {
      // Find JPEG start marker 0xFF 0xD8 within the pixel data segment
      const offset = pixelDataElement.dataOffset;
      const end = bytes.length;
      let jpegStart = -1;

      for (let i = offset; i < end - 1; i++) {
        if (bytes[i] === 0xff && bytes[i + 1] === 0xd8) {
          jpegStart = i;
          break;
        }
      }

      if (jpegStart !== -1) {
        // Find JPEG end marker 0xFF 0xD9
        let jpegEnd = -1;
        for (let j = jpegStart + 2; j < end - 1; j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            jpegEnd = j + 2;
            break;
          }
        }

        const sliceEnd = jpegEnd !== -1 ? jpegEnd : end;
        const jpegBytes = bytes.slice(jpegStart, sliceEnd);
        const blob = new Blob([jpegBytes], { type: 'image/jpeg' });
        const dataUrl = await blobToDataUrl(blob);
        return { dataUrl, metadata, width: cols, height: rows };
      }
    } catch (encErr) {
      console.warn('Encapsulated JPEG extraction fallback:', encErr);
    }
  }

  // 2. Uncompressed Raw Pixel Data (8-bit or 16-bit Grayscale or RGB)
  const pixelOffset = pixelDataElement.dataOffset;
  const numPixels = rows * cols;
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(cols, rows);
  const rgba = imgData.data;

  if (samplesPerPixel === 3) {
    // RGB Color DICOM
    for (let i = 0; i < numPixels; i++) {
      const srcIdx = pixelOffset + i * 3;
      const dstIdx = i * 4;
      rgba[dstIdx] = bytes[srcIdx];
      rgba[dstIdx + 1] = bytes[srcIdx + 1];
      rgba[dstIdx + 2] = bytes[srcIdx + 2];
      rgba[dstIdx + 3] = 255;
    }
  } else if (bitsAllocated === 8) {
    // 8-bit Grayscale
    const isMonochrome1 = photometricInterpretation === 'MONOCHROME1';
    for (let i = 0; i < numPixels; i++) {
      let val = bytes[pixelOffset + i];
      if (isMonochrome1) val = 255 - val;
      const dstIdx = i * 4;
      rgba[dstIdx] = val;
      rgba[dstIdx + 1] = val;
      rgba[dstIdx + 2] = val;
      rgba[dstIdx + 3] = 255;
    }
  } else {
    // 16-bit Grayscale (Default for CT, MRI, X-Ray)
    const isSigned = pixelRepresentation === 1;
    const view = new DataView(bytes.buffer, bytes.byteOffset + pixelOffset, numPixels * 2);

    // Compute min / max if windowCenter / width not provided
    let minVal = Infinity;
    let maxVal = -Infinity;

    if (windowCenter === null || windowWidth === null) {
      for (let i = 0; i < numPixels; i++) {
        const raw = isSigned ? view.getInt16(i * 2, true) : view.getUint16(i * 2, true);
        const val = raw * rescaleSlope + rescaleIntercept;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }
      windowCenter = (minVal + maxVal) / 2;
      windowWidth = Math.max(1, maxVal - minVal);
    }

    const low = windowCenter - windowWidth / 2;
    const high = windowCenter + windowWidth / 2;
    const isMonochrome1 = photometricInterpretation === 'MONOCHROME1';

    for (let i = 0; i < numPixels; i++) {
      const raw = isSigned ? view.getInt16(i * 2, true) : view.getUint16(i * 2, true);
      const val = raw * rescaleSlope + rescaleIntercept;
      let intensity = ((val - low) / windowWidth) * 255;
      if (intensity < 0) intensity = 0;
      if (intensity > 255) intensity = 255;
      if (isMonochrome1) intensity = 255 - intensity;

      const dstIdx = i * 4;
      rgba[dstIdx] = intensity;
      rgba[dstIdx + 1] = intensity;
      rgba[dstIdx + 2] = intensity;
      rgba[dstIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const dataUrl = canvas.toDataURL('image/png');
  return { dataUrl, metadata, width: cols, height: rows };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
