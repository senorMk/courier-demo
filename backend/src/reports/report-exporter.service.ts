import { BadRequestException, Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';

export type ReportExportFormat = 'csv' | 'excel' | 'pdf';

export type ExportColumn = {
  header: string;
  key: string;
};

export type ExportMetadataEntry = {
  label: string;
  value: unknown;
};

export type ReportExportOptions = {
  format: ReportExportFormat;
  fileBaseName: string;
  sheetName: string;
  columns: ExportColumn[];
  rows: Record<string, unknown>[];
  metadata?: ExportMetadataEntry[];
};

export type ReportExportResult = {
  buffer: Buffer;
  contentType: string;
  fileName: string;
};

@Injectable()
export class ReportExporterService {
  async export(options: ReportExportOptions): Promise<ReportExportResult> {
    switch (options.format) {
      case 'csv':
        return this.exportCsv(options);
      case 'excel':
        return this.exportExcel(options);
      case 'pdf':
        return this.exportPdf(options);
      default:
        throw new BadRequestException('format must be either "csv", "excel", or "pdf"');
    }
  }

  private async exportExcel(options: ReportExportOptions): Promise<ReportExportResult> {
    const workbook = new Workbook();
    const sheetName = options.sheetName.slice(0, 31) || 'Report';
    const worksheet = workbook.addWorksheet(sheetName);

    if (options.metadata?.length) {
      options.metadata.forEach((entry) => {
        worksheet.addRow([entry.label, this.formatForDisplay(entry.value)]);
      });
      worksheet.addRow([]);
    }

    worksheet.columns = options.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: 34,
    }));

    options.rows.forEach((row) => {
      const normalized: Record<string, string | number | null> = {};
      for (const column of options.columns) {
        normalized[column.key] = this.formatForCell(row[column.key]);
      }
      worksheet.addRow(normalized);
    });

    const content = await workbook.xlsx.writeBuffer();
    const buffer = Buffer.isBuffer(content)
      ? content
      : Buffer.from(content as ArrayBuffer);

    return {
      buffer,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      fileName: `${this.toFileName(options.fileBaseName)}.xlsx`,
    };
  }

  private exportCsv(options: ReportExportOptions): ReportExportResult {
    const segments: string[] = [];

    if (options.metadata?.length) {
      options.metadata.forEach((entry) => {
        segments.push(
          [this.escapeCsv(entry.label), this.escapeCsv(this.formatForDisplay(entry.value))].join(','),
        );
      });
      segments.push('');
    }

    segments.push(options.columns.map((column) => this.escapeCsv(column.header)).join(','));

    options.rows.forEach((row) => {
      const values = options.columns.map((column) => this.escapeCsv(this.formatForDisplay(row[column.key])));
      segments.push(values.join(','));
    });

    const buffer = Buffer.from(segments.join('\r\n'), 'utf8');

    return {
      buffer,
      contentType: 'text/csv',
      fileName: `${this.toFileName(options.fileBaseName)}.csv`,
    };
  }

  private formatForCell(value: unknown): string | number | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return this.formatForDisplay(value);
  }

  private formatForDisplay(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.formatForDisplay(item)).join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  private escapeCsv(value: string): string {
    if (value.includes('"')) {
      value = value.replace(/"/g, '""');
    }
    if (/[",\r\n]/.test(value)) {
      return `"${value}"`;
    }
    return value;
  }

  private async exportPdf(options: ReportExportOptions): Promise<ReportExportResult> {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PDFDocument = require('pdfkit');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          buffer,
          contentType: 'application/pdf',
          fileName: `${this.toFileName(options.fileBaseName)}.pdf`,
        });
      });
      doc.on('error', reject);

      // Add title
      doc.fontSize(18).font('Helvetica-Bold').text(options.sheetName, { align: 'center' });
      doc.moveDown(0.5);

      // Add metadata if provided
      if (options.metadata?.length) {
        doc.fontSize(10).font('Helvetica');
        options.metadata.forEach((entry) => {
          doc.text(`${entry.label}: ${this.formatForDisplay(entry.value)}`);
        });
        doc.moveDown(1);
      }

      // Calculate column widths
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const columnCount = options.columns.length;
      const columnWidth = pageWidth / columnCount;

      // Draw table header
      doc.fontSize(10).font('Helvetica-Bold');
      let currentX = doc.page.margins.left;
      const headerY = doc.y;

      options.columns.forEach((column) => {
        doc.text(column.header, currentX, headerY, {
          width: columnWidth,
          align: 'left',
        });
        currentX += columnWidth;
      });

      doc.moveDown(0.5);

      // Draw header line
      doc.moveTo(doc.page.margins.left, doc.y)
         .lineTo(doc.page.width - doc.page.margins.right, doc.y)
         .stroke();

      doc.moveDown(0.5);

      // Draw table rows
      doc.fontSize(9).font('Helvetica');
      options.rows.forEach((row, index) => {
        // Check if we need a new page
        if (doc.y > doc.page.height - doc.page.margins.bottom - 50) {
          doc.addPage();
        }

        currentX = doc.page.margins.left;
        const rowY = doc.y;

        options.columns.forEach((column) => {
          const value = this.formatForDisplay(row[column.key]);
          doc.text(value, currentX, rowY, {
            width: columnWidth,
            align: 'left',
            continued: false,
          });
          currentX += columnWidth;
        });

        doc.moveDown(0.8);

        // Add subtle line between rows
        if ((index + 1) % 5 === 0) {
          doc.moveTo(doc.page.margins.left, doc.y)
             .lineTo(doc.page.width - doc.page.margins.right, doc.y)
             .strokeOpacity(0.2)
             .stroke()
             .strokeOpacity(1);
          doc.moveDown(0.3);
        }
      });

      // Add footer with page numbers
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica').text(
          `Page ${i + 1} of ${range.count}`,
          doc.page.margins.left,
          doc.page.height - doc.page.margins.bottom + 10,
          { align: 'center' }
        );
      }

      doc.end();
    });
  }

  private toFileName(baseName: string): string {
    const sanitized = baseName.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
    return sanitized || 'report';
  }
}