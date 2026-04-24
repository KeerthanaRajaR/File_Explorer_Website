import { NextRequest } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { createErrorResponse, createSuccessResponse } from '@/lib/server/apiWrapper';
import { resolveSafePath, getRelativePath } from '@/lib/server/pathUtils';

const ensurePdfExt = (name: string): string => (name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sourcePaths = Array.isArray(body?.sourcePaths) ? (body.sourcePaths as string[]) : [];
    const destinationPath = typeof body?.destinationPath === 'string' ? body.destinationPath : '/';
    const outputNameRaw = typeof body?.outputName === 'string' && body.outputName.trim() ? body.outputName.trim() : 'merged.pdf';
    const outputName = ensurePdfExt(outputNameRaw.replace(/[\\/:*?"<>|]/g, '_'));

    if (sourcePaths.length < 2) {
      return createErrorResponse('At least 2 PDF files are required', 400);
    }

    const safeDestinationDir = resolveSafePath(destinationPath);
    if (!safeDestinationDir) {
      return createErrorResponse('INVALID_DESTINATION_PATH', 400);
    }

    await fsp.mkdir(safeDestinationDir, { recursive: true });

    const mergedPdf = await PDFDocument.create();

    for (const relativeSource of sourcePaths) {
      const safeSource = resolveSafePath(relativeSource);
      if (!safeSource || path.extname(safeSource).toLowerCase() !== '.pdf') {
        return createErrorResponse(`Invalid PDF source path: ${relativeSource}`, 400);
      }

      const sourceBytes = await fsp.readFile(safeSource);
      const sourceDoc = await PDFDocument.load(sourceBytes);
      const sourcePages = await mergedPdf.copyPages(sourceDoc, sourceDoc.getPageIndices());
      sourcePages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBytes = await mergedPdf.save();
    const outputAbsolutePath = path.join(safeDestinationDir, outputName);

    if (fs.existsSync(outputAbsolutePath)) {
      return createErrorResponse('OUTPUT_FILE_ALREADY_EXISTS', 409);
    }

    await fsp.writeFile(outputAbsolutePath, Buffer.from(mergedBytes));

    return createSuccessResponse({
      outputPath: getRelativePath(outputAbsolutePath),
      outputName,
      sourceCount: sourcePaths.length,
    });
  } catch (error: any) {
    return createErrorResponse(error?.message || 'FAILED_TO_MERGE_PDFS', 500);
  }
}
