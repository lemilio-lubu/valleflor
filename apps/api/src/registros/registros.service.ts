import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistroDiario } from './registro-diario.entity';
import { BaseSemanalService } from '../base-semanal/base-semanal.service';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { UpdateRegistroDto } from './dto/update-registro.dto';
import { UpdateDivisorDto } from './dto/update-divisor.dto';
import { BulkUpdateItemDto } from './dto/bulk-update.dto';

/** Resultado de PATCH /registros/:id — puede incluir un warning de tipeo */
export interface UpdateRegistroResult {
  data: RegistroDiario;
  warning?: string;
}

@Injectable()
export class RegistrosService {
  constructor(
    @InjectRepository(RegistroDiario)
    private readonly registroRepo: Repository<RegistroDiario>,
    private readonly baseSemanalService: BaseSemanalService,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  // ── helpers ─────────────────────────────────────────────────────────────────

  private round2(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private calcTallos(cajas: number, divisorTallos: number): number {
    return this.round2(cajas * divisorTallos);
  }

  private async getOrFail(id: string): Promise<RegistroDiario> {
    const registro = await this.registroRepo.findOne({
      where: { id },
      relations: ['semana'],
    });
    if (!registro) {
      throw new NotFoundException(`Registro ${id} no encontrado`);
    }
    return registro;
  }

  /**
   * Obtiene el promedio de cajas de los últimos 5 registros del mismo color
   * (excluyendo el registro actual) para detección de tipeo.
   */
  private async promedioUltimos5(colorId: string, excludeId: string): Promise<number> {
    const ultimos = await this.registroRepo
      .createQueryBuilder('r')
      .where('r.color_id = :colorId', { colorId })
      .andWhere('r.id != :excludeId', { excludeId })
      .andWhere('r.cajas > 0')
      .orderBy('r.created_at', 'DESC')
      .limit(5)
      .getMany();

    if (ultimos.length === 0) return 0;
    const suma = ultimos.reduce((acc, r) => acc + Number(r.cajas), 0);
    return suma / ultimos.length;
  }

  // ── public API ──────────────────────────────────────────────────────────────

  /** GET /registros?semanaId=uuid */
  async findBySemana(semanaId: string): Promise<RegistroDiario[]> {
    return this.registroRepo.find({
      where: { semanaId },
      relations: ['color', 'color.variedad', 'color.variedad.producto'],
      order: { dia: 'ASC' },
    });
  }

  /** PATCH /registros/:id — actualiza cajas */
  async updateCajas(
    id: string,
    dto: UpdateRegistroDto,
  ): Promise<UpdateRegistroResult> {
    const registro = await this.getOrFail(id);

    // 1. Redondear cajas a máximo 2 decimales
    const cajas = this.round2(dto.cajas);
    const tallosPorCaja = await this.configuracionService.getTallosPorCaja();

    // 2. Detección de tipeo (warning, no error)
    let warning: string | undefined;
    const promedio = await this.promedioUltimos5(registro.colorId, id);
    if (promedio > 0 && cajas > promedio * 3) {
      warning = 'Valor inusualmente alto, verifique';
    }

    // 3. Calcular tallos con constante global
    const tallos = this.calcTallos(cajas, tallosPorCaja);

    // 4. Guardar
    registro.cajas = cajas;
    registro.divisorTallos = tallosPorCaja;
    registro.tallos = tallos;
    const saved = await this.registroRepo.save(registro);

    // 5. Recalcular base semanal del color
    await this.baseSemanalService.recalcular(
      registro.colorId,
      registro.semanaId,
      registro.semana.numeroSemana,
      registro.semana.anio,
    );

    return warning ? { data: saved, warning } : { data: saved };
  }

  /** PATCH /registros/:id/divisor — actualiza solo divisor_tallos y recalcula tallos */
  async updateDivisor(
    id: string,
    dto: UpdateDivisorDto,
  ): Promise<RegistroDiario> {
    const registro = await this.getOrFail(id);

    registro.divisorTallos = dto.divisorTallos;
    registro.tallos = this.calcTallos(Number(registro.cajas), dto.divisorTallos);
    const saved = await this.registroRepo.save(registro);

    await this.baseSemanalService.recalcular(
      registro.colorId,
      registro.semanaId,
      registro.semana.numeroSemana,
      registro.semana.anio,
    );

    return saved;
  }

  /** POST /registros/recalcular-todos — recalcula tallos de todos los registros con la fórmula actual */
  async recalcularTodos(): Promise<{ actualizados: number }> {
    const registros = await this.registroRepo.find({ relations: ['semana'] });
    for (const r of registros) {
      r.tallos = this.calcTallos(Number(r.cajas), r.divisorTallos);
      await this.registroRepo.save(r);
    }
    return { actualizados: registros.length };
  }

  /** POST /registros/bulk-update — actualiza múltiples registros */
  async bulkUpdate(
    updates: BulkUpdateItemDto[],
  ): Promise<UpdateRegistroResult[]> {
    const results: UpdateRegistroResult[] = [];

    for (const item of updates) {
      const result = await this.updateCajas(item.id, {
        cajas: item.cajas,
        divisorTallos: item.divisorTallos,
      });
      results.push(result);
    }

    return results;
  }
}
