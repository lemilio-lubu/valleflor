import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseSemanal } from '../base-semanal/base-semanal.entity';

export interface VentaRow {
  producto: string;
  variedad: string;
  color: string;
  totalCajas: number;
  totalTallos: number;
}

@Injectable()
export class VentasService {
  constructor(
    @InjectRepository(BaseSemanal)
    private readonly baseSemanalRepo: Repository<BaseSemanal>,
  ) {}

  /**
   * GET /ventas?fincaId=uuid
   * Suma histórica total de cajas y tallos agrupada por color.
   * No filtra por semana — es el consolidado completo.
   */
  async findByFinca(fincaId: string): Promise<VentaRow[]> {
    const raw = await this.baseSemanalRepo
      .createQueryBuilder('bs')
      .select('p.nombre', 'producto')
      .addSelect('v.nombre', 'variedad')
      .addSelect('c.nombre', 'color')
      .addSelect('SUM(bs.cajasTotal)', 'totalCajas')
      .addSelect('SUM(bs.tallosTotal)', 'totalTallos')
      .innerJoin('bs.color', 'c')
      .innerJoin('c.variedad', 'v')
      .innerJoin('v.producto', 'p')
      .where('p.fincaId = :fincaId', { fincaId })
      .groupBy('c.id')
      .addGroupBy('v.id')
      .addGroupBy('p.id')
      .addGroupBy('p.nombre')
      .addGroupBy('v.nombre')
      .addGroupBy('c.nombre')
      .orderBy('p.nombre', 'ASC')
      .addOrderBy('v.nombre', 'ASC')
      .addOrderBy('c.nombre', 'ASC')
      .getRawMany();

    return raw.map((r) => ({
      producto: r.producto,
      variedad: r.variedad,
      color: r.color,
      totalCajas: Number(r.totalCajas),
      totalTallos: Number(r.totalTallos),
    }));
  }
}
