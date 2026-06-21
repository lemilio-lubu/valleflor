import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { MovimientoDto } from './auditoria.service';

@Injectable()
export class AuditoriaPdfService {
  /**
   * Genera un PDF con la lista de movimientos ya filtrados. El llamador aplica
   * los filtros antes, así que el documento refleja exactamente lo consultado.
   */
  generar(
    movimientos: MovimientoDto[],
    opts: { modulo?: string } = {},
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 36, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const titulo = opts.modulo
        ? `Auditoría — módulo de ${opts.modulo}`
        : 'Auditoría del sistema';
      doc.fontSize(16).text(titulo);
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#666').text(`Movimientos: ${movimientos.length}`);
      doc.moveDown();
      doc.fillColor('#000').fontSize(10);

      if (movimientos.length === 0) {
        doc.text('No hay movimientos registrados.');
      } else {
        for (const m of movimientos) {
          const fecha = new Date(m.fecha).toISOString().replace('T', ' ').slice(0, 16);
          const cambio =
            m.valorAnterior != null || m.valorNuevo != null
              ? `  (${m.valorAnterior ?? '—'} → ${m.valorNuevo ?? '—'})`
              : '';
          doc.text(`${fecha} · ${m.responsable} · ${m.accion}${cambio}`);
        }
      }

      doc.end();
    });
  }
}
