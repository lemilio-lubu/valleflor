import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as xlsx from 'xlsx';
import * as crypto from 'crypto';

import { Finca } from '../fincas/finca.entity';
import { User } from '../users/user.entity';
import { Responsable } from '../responsables/responsable.entity';
import { Producto } from '../productos/producto.entity';
import { Variedad } from '../variedades/variedad.entity';
import { Color } from '../colores/color.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { SemanaReconciliationService } from '../base-semanal/semana-reconciliation.service';

export interface BulkUploadSummary {
  insertados: number;
  actualizados: number;
  omitidos: number;
  errores: string[];
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Finca) private fincaRepo: Repository<Finca>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Responsable) private responsableRepo: Repository<Responsable>,
    @InjectRepository(Producto) private productoRepo: Repository<Producto>,
    @InjectRepository(Variedad) private variedadRepo: Repository<Variedad>,
    @InjectRepository(Color) private colorRepo: Repository<Color>,
    @InjectRepository(ResponsableColor) private respColorRepo: Repository<ResponsableColor>,
    private readonly reconciliationService: SemanaReconciliationService,
  ) {}

  async processBulkUpload(file: Express.Multer.File, isPreview = false): Promise<BulkUploadSummary> {
    const summary: BulkUploadSummary = {
      insertados: 0,
      actualizados: 0,
      omitidos: 0,
      errores: [],
    };

    let workbook;
    try {
      workbook = xlsx.read(file.buffer, { type: 'buffer' });
    } catch (e) {
      throw new BadRequestException('El archivo no es un Excel válido.');
    }

    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any>(sheet, { defval: '' });

    // Cache entities to avoid excessive DB queries for every row
    const fincasMap = new Map<string, Finca>();
    const responsablesMap = new Map<string, Responsable>();
    const productosMap = new Map<string, Producto>();
    const variedadesMap = new Map<string, Variedad>();
    const coloresMap = new Map<string, Color>();

    // Devuelve el primer valor no vacío entre varios alias de un mismo header
    // (ej. "CODIGO" / "CODIGO VAR", "NOMBRE" / "NOMBRE COMERCIAL", "CAJA" / "TALLOS")
    const pick = (normalizedRow: Record<string, unknown>, ...aliases: string[]): string => {
      for (const alias of aliases) {
        const value = normalizedRow[alias];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
          return String(value).trim().toUpperCase();
        }
      }
      return '';
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // +1 for 0-index, +1 for header

      // Normalize row keys
      const normalizedRow: any = {};
      for (const key of Object.keys(row)) {
        normalizedRow[key.trim().toUpperCase()] = row[key];
      }

      // FINCA/RESPONSABLE son opcionales: si se incluyen, además de armar el
      // catálogo se asigna el color al responsable indicado.
      const rFinca = pick(normalizedRow, 'FINCA');
      const rResponsable = pick(normalizedRow, 'RESPONSABLE');
      const rCodigo = pick(normalizedRow, 'CODIGO', 'CODIGO VAR', 'CÓDIGO', 'CÓDIGO VAR');
      const rProducto = pick(normalizedRow, 'PRODUCTO');
      const rVariedad = pick(normalizedRow, 'VARIEDAD');
      const rColor = pick(normalizedRow, 'COLOR');
      const rNombre = pick(normalizedRow, 'NOMBRE', 'NOMBRE COMERCIAL');
      const rawCaja = pick(normalizedRow, 'CAJA', 'TALLOS', 'TALLOS POR CAJA');
      const rCaja = rawCaja ? parseInt(rawCaja, 10) : undefined;

      // CODIGO es opcional: sin él, el color se identifica por variedad+nombre.
      if (!rProducto || !rVariedad || !rColor) {
        summary.errores.push(`Fila ${rowIndex}: Faltan datos requeridos (PRODUCTO, VARIEDAD, COLOR).`);
        continue;
      }

      const debeAsignarResponsable = !!rFinca || !!rResponsable;
      if (debeAsignarResponsable && (!rFinca || !rResponsable)) {
        summary.errores.push(
          `Fila ${rowIndex}: Se especificó FINCA o RESPONSABLE sin el otro; no se asignó el color a ningún responsable.`,
        );
      }

      // 1 y 2. Resolver Finca/Responsable solo cuando la fila pide asignación
      let finca: Finca | undefined;
      let responsable: Responsable | undefined;
      if (debeAsignarResponsable && rFinca && rResponsable) {
        // Comparación case-insensitive: el alta de fincas guarda el nombre tal
        // cual (mixed-case) y la carga llega en mayúsculas.
        finca = fincasMap.get(rFinca);
        if (!finca) {
          finca = await this.fincaRepo
            .createQueryBuilder('finca')
            .where('UPPER(finca.nombre) = :nombre', { nombre: rFinca })
            .getOne();
          if (finca) fincasMap.set(rFinca, finca);
        }
        if (!finca) {
          summary.errores.push(`Fila ${rowIndex}: La finca '${rFinca}' no existe en el sistema.`);
          continue;
        }

        const responsableKey = `${rFinca}-${rResponsable}`;
        responsable = responsablesMap.get(responsableKey);
        if (!responsable) {
          // Find user by exact name (uppercase) or email
          const userQuery = this.userRepo.createQueryBuilder('user')
            .where('UPPER(user.nombre) = :name', { name: rResponsable })
            .orWhere('UPPER(user.email) = :email', { email: rResponsable })
            .orWhere("UPPER(SPLIT_PART(user.email, '@', 1)) = :emailPrefix", { emailPrefix: rResponsable });

          const user = await userQuery.getOne();

          if (user) {
            responsable = await this.responsableRepo.findOne({ where: { userId: user.id, fincaId: finca.id } });
            if (responsable) responsablesMap.set(responsableKey, responsable);
          }
        }

        if (!responsable) {
          summary.errores.push(`Fila ${rowIndex}: El responsable '${rResponsable}' no existe o no está asignado a la finca '${rFinca}'.`);
          continue;
        }
      }

      // 3. Find or Create Producto (catálogo global, identificado por nombre)
      const productoKey = rProducto;
      let producto = productosMap.get(productoKey);
      if (!producto) {
        producto = await this.productoRepo.findOne({ where: { nombre: rProducto } });
        if (!producto) {
          producto = this.productoRepo.create({ nombre: rProducto });
          if (isPreview) {
            producto.id = crypto.randomUUID();
          } else {
            await this.productoRepo.save(producto);
          }
          summary.insertados++;
        }
        productosMap.set(productoKey, producto);
      }

      // 4. Find or Create Variedad
      const variedadKey = `${producto.id}-${rVariedad}`;
      let variedad = variedadesMap.get(variedadKey);
      if (!variedad) {
        variedad = await this.variedadRepo.findOne({ where: { nombre: rVariedad, productoId: producto.id } });
        if (!variedad) {
          variedad = this.variedadRepo.create({ nombre: rVariedad, productoId: producto.id });
          if (isPreview) {
            variedad.id = crypto.randomUUID();
          } else {
            await this.variedadRepo.save(variedad);
          }
          summary.insertados++;
        }
        variedadesMap.set(variedadKey, variedad);
      }

      // 5. Find or Create Color (la HOJA = definición productiva).
      // Con CODIGO, se identifica por código (permite re-cargas consistentes).
      // Sin CODIGO, se identifica por variedad+nombre (único vía uq_color_nombre_variedad).
      const colorKey = rCodigo ? `codigo:${rCodigo}` : `variedad:${variedad.id}:${rColor}`;
      let color = coloresMap.get(colorKey);
      if (!color) {
        color = rCodigo
          ? (await this.colorRepo.findOne({ where: { codigo: rCodigo } })) ?? undefined
          : (await this.colorRepo.findOne({ where: { nombre: rColor, variedadId: variedad.id } })) ?? undefined;
        if (!color) {
          color = this.colorRepo.create({
            nombre: rColor,
            variedadId: variedad.id,
            codigo: rCodigo || null,
            nombreComercial: rNombre || null,
            tallosPorCaja: rCaja ?? 400,
          });
          if (isPreview) {
            color.id = crypto.randomUUID();
          } else {
            await this.colorRepo.save(color);
          }
          summary.insertados++;
        } else {
          // Actualizar atributos de la definición si cambiaron
          let cambio = false;
          if (rNombre && color.nombreComercial !== rNombre) { color.nombreComercial = rNombre; cambio = true; }
          if (rCaja !== undefined && color.tallosPorCaja !== rCaja) { color.tallosPorCaja = rCaja; cambio = true; }
          if (cambio) {
            if (!isPreview) await this.colorRepo.save(color);
            summary.actualizados++;
          }
        }
        coloresMap.set(colorKey, color);
      }

      // 6. Manage ResponsableColor duplicate checks — solo si la fila trae
      // FINCA + RESPONSABLE (asignación opcional); si no, la fila solo aporta
      // al catálogo (Producto/Variedad/Color) y no asigna nada.
      if (responsable) {
        const association = await this.respColorRepo.findOne({
          where: { responsableId: responsable.id, colorId: color.id }
        });

        // Si es un preview, tenemos que asegurarnos de no consultar a la BD con un id de color inventado
        // Si el id es inventado (uuid válido, pero no en BD), findOne retornará null, lo cual está bien.

        if (association) {
          summary.omitidos++;
        } else {
          const newAssoc = this.respColorRepo.create({ responsableId: responsable.id, colorId: color.id });
          if (!isPreview) {
            await this.respColorRepo.save(newAssoc);
          }
          summary.insertados++;
        }
      }
    }

    // Sincronizar las semanas actual y futuras de cada responsable tocado por la
    // carga con sus nuevas asignaciones (no aplica en modo preview)
    if (!isPreview) {
      for (const responsable of responsablesMap.values()) {
        await this.reconciliationService.reconcileResponsable(responsable.id);
      }
    }

    return summary;
  }
}
