import { BadRequestException, Injectable } from '@nestjs/common';
import { Workbook } from 'exceljs';

export type ReportExportFormat = 'csv' | 'excel';

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
      default:
        throw new BadRequestException('format must be either "csv" or "excel"');
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

  private toFileName(baseName: string): string {
    const sanitized = baseName.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-');
    return sanitized || 'report';
  }
}
