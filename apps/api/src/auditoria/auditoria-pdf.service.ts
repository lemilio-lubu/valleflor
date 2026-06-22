import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { MovimientoDto } from './auditoria.service';

// Paleta Terrazul (coherente con la exportación a Excel del consolidado).
const COLOR = {
  brand: '#1B3FA0',
  brandSoft: '#E8EDF8',
  headerText: '#FFFFFF',
  text: '#101828',
  muted: '#475467',
  faint: '#98A2B3',
  border: '#E4E7EC',
  rowAlt: '#F7F8FA',
  white: '#FFFFFF',
  crear: '#15803D',
  editar: '#1B3FA0',
  baja: '#DC2626',
};

interface Columna {
  key: keyof MovimientoDto | 'detalleFecha';
  label: string;
  width: number;
  get: (m: MovimientoDto) => string;
  color?: (m: MovimientoDto) => string;
}

// La fuente estándar (Helvetica/WinAnsi) no incluye la flecha Unicode "→";
// se sustituye por "->" para que se renderice correctamente en el PDF.
function safeTexto(s: string): string {
  return s.replace(/→/g, '->');
}

function fmtFecha(iso: Date | string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function colorAccion(accion: string): string {
  if (accion === 'Creación') return COLOR.crear;
  if (accion === 'Alta') return COLOR.crear;
  if (accion === 'Edición') return COLOR.editar;
  if (accion === 'Baja') return COLOR.baja;
  return COLOR.text;
}

@Injectable()
export class AuditoriaPdfService {
  /**
   * Genera un PDF con una tabla estilizada de los movimientos ya filtrados.
   * El llamador aplica los filtros antes, así que el documento refleja
   * exactamente lo consultado.
   */
  generar(
    movimientos: MovimientoDto[],
    opts: { modulo?: string } = {},
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
      const chunks: Buffer[] = [];
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const left = doc.page.margins.left;
      const right = doc.page.width - doc.page.margins.right;
      const usable = right - left;

      // Anchos proporcionales al espacio disponible (suma de pesos = 1).
      const pesos = { fecha: 0.14, resp: 0.16, accion: 0.15, campo: 0.11, ant: 0.22, nuevo: 0.22 };
      const columnas: Columna[] = [
        { key: 'fecha', label: 'Fecha', width: usable * pesos.fecha, get: (m) => fmtFecha(m.fecha) },
        { key: 'responsable', label: 'Responsable', width: usable * pesos.resp, get: (m) => m.responsable },
        {
          key: 'accion', label: 'Acción', width: usable * pesos.accion,
          get: (m) => m.accion, color: (m) => colorAccion(m.accion),
        },
        { key: 'campo', label: 'Campo', width: usable * pesos.campo, get: (m) => m.campo ?? '—' },
        { key: 'valorAnterior', label: 'Valor anterior', width: usable * pesos.ant, get: (m) => m.valorAnterior ?? '—' },
        { key: 'valorNuevo', label: 'Valor nuevo', width: usable * pesos.nuevo, get: (m) => m.valorNuevo ?? '—' },
      ];

      const PAD = 6;
      const FS = 8.5;
      const bottom = doc.page.height - doc.page.margins.bottom;

      // ── Cabecera del documento ────────────────────────────────────────────
      const drawTitulo = () => {
        const titulo = opts.modulo
          ? `Auditoría — ${opts.modulo.charAt(0).toUpperCase() + opts.modulo.slice(1)}`
          : 'Auditoría del sistema';
        const y0 = doc.y;
        doc.rect(left, y0, usable, 30).fill(COLOR.brand);
        doc
          .fillColor(COLOR.headerText)
          .font('Helvetica-Bold')
          .fontSize(14)
          .text(titulo, left + PAD, y0 + 8, { width: usable - PAD * 2, lineBreak: false });
        doc
          .fillColor(COLOR.muted)
          .font('Helvetica')
          .fontSize(8)
          .text(
            `Generado: ${fmtFecha(new Date())}    ·    Movimientos: ${movimientos.length}`,
            left,
            y0 + 36,
          );
        doc.y = y0 + 52;
      };

      // ── Fila de encabezado de la tabla ────────────────────────────────────
      const drawHeader = () => {
        const y = doc.y;
        doc.rect(left, y, usable, 20).fill(COLOR.brand);
        let x = left;
        doc.fillColor(COLOR.headerText).font('Helvetica-Bold').fontSize(8.5);
        for (const c of columnas) {
          doc.text(c.label.toUpperCase(), x + PAD, y + 6, {
            width: c.width - PAD * 2,
            lineBreak: false,
            ellipsis: true,
          });
          x += c.width;
        }
        doc.y = y + 20;
      };

      drawTitulo();
      drawHeader();

      if (movimientos.length === 0) {
        doc
          .fillColor(COLOR.muted)
          .font('Helvetica-Oblique')
          .fontSize(10)
          .text('No hay movimientos registrados.', left + PAD, doc.y + 12);
        doc.end();
        return;
      }

      // ── Filas de datos ────────────────────────────────────────────────────
      doc.font('Helvetica').fontSize(FS);
      movimientos.forEach((m, i) => {
        // Valores ya saneados (una sola vez) para medir y dibujar igual.
        const valores = columnas.map((c) => safeTexto(c.get(m)));

        // Altura de la fila = la celda más alta (texto con ajuste de línea).
        const alturas = valores.map((v, idx) =>
          doc.heightOfString(v, { width: columnas[idx].width - PAD * 2 }),
        );
        const rowH = Math.max(18, ...alturas) + PAD;

        // Salto de página: repetir encabezado de tabla.
        if (doc.y + rowH > bottom) {
          doc.addPage();
          drawHeader();
        }

        const y = doc.y;
        // Fondo alterno.
        if (i % 2 === 1) doc.rect(left, y, usable, rowH).fill(COLOR.rowAlt);

        let x = left;
        columnas.forEach((c, idx) => {
          doc
            .fillColor(c.color ? c.color(m) : COLOR.text)
            .font(c.key === 'accion' ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(FS)
            .text(valores[idx], x + PAD, y + PAD / 2, { width: c.width - PAD * 2 });
          x += c.width;
        });

        // Línea separadora inferior.
        doc
          .moveTo(left, y + rowH)
          .lineTo(right, y + rowH)
          .strokeColor(COLOR.border)
          .lineWidth(0.5)
          .stroke();

        doc.y = y + rowH;
      });

      doc.end();
    });
  }
}
