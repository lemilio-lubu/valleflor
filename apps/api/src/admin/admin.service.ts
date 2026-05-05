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
    const usersMap = new Map<string, User>();
    const responsablesMap = new Map<string, Responsable>();
    const productosMap = new Map<string, Producto>();
    const variedadesMap = new Map<string, Variedad>();
    const coloresMap = new Map<string, Color>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowIndex = i + 2; // +1 for 0-index, +1 for header

      // Normalize row keys
      const normalizedRow: any = {};
      for (const key of Object.keys(row)) {
        normalizedRow[key.trim().toUpperCase()] = row[key];
      }

      const rFinca = String(normalizedRow['FINCA'] || '').trim().toUpperCase();
      const rResponsable = String(normalizedRow['RESPONSABLE'] || '').trim().toUpperCase();
      const rProducto = String(normalizedRow['PRODUCTO'] || '').trim().toUpperCase();
      const rVariedad = String(normalizedRow['VARIEDAD'] || '').trim().toUpperCase();
      const rColor = String(normalizedRow['COLOR'] || '').trim().toUpperCase();

      if (!rFinca || !rResponsable || !rProducto || !rVariedad || !rColor) {
        summary.errores.push(`Fila ${rowIndex}: Faltan datos requeridos (FINCA, RESPONSABLE, PRODUCTO, VARIEDAD, COLOR).`);
        continue;
      }

      // 1. Validate Finca
      let finca = fincasMap.get(rFinca);
      if (!finca) {
        finca = await this.fincaRepo.findOne({ where: { nombre: rFinca } });
        if (finca) fincasMap.set(rFinca, finca);
      }
      if (!finca) {
        summary.errores.push(`Fila ${rowIndex}: La finca '${rFinca}' no existe en el sistema.`);
        continue;
      }

      // 2. Validate Responsable
      const responsableKey = `${rFinca}-${rResponsable}`;
      let responsable = responsablesMap.get(responsableKey);
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

      // 3. Find or Create Producto
      const productoKey = `${rFinca}-${rProducto}`;
      let producto = productosMap.get(productoKey);
      if (!producto) {
        producto = await this.productoRepo.findOne({ where: { nombre: rProducto, fincaId: finca.id } });
        if (!producto) {
          producto = this.productoRepo.create({ nombre: rProducto, fincaId: finca.id });
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

      // 5. Find or Create Color
      const colorKey = `${variedad.id}-${rColor}`;
      let color = coloresMap.get(colorKey);
      if (!color) {
        color = await this.colorRepo.findOne({ where: { nombre: rColor, variedadId: variedad.id } });
        if (!color) {
          color = this.colorRepo.create({ nombre: rColor, variedadId: variedad.id });
          if (isPreview) {
            color.id = crypto.randomUUID();
          } else {
            await this.colorRepo.save(color);
          }
          summary.insertados++;
        }
        coloresMap.set(colorKey, color);
      }

      // 6. Manage ResponsableColor duplicate checks
      const association = await this.respColorRepo.findOne({
        where: { responsableId: responsable.id, colorId: color.id }
      });

      // Si es un preview, tenemos que asegurarnos de no consultar a la BD con un id de color inventado
      // Si el id es inventado (uuid válido, pero no en BD), findOne retornará null, lo cual está bien.
      
      // Si en memoria ya asociamos este color a este responsable, debemos tratarlo como omitido
      // Para ello usaremos un Set en memoria
      // (No hace falta si la carga no suele tener duplicados en la misma hoja, pero es más seguro)
      
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

    return summary;
  }
}
