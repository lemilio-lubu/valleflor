import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Semana } from '../semanas/semana.entity';
import { RegistroDiario } from '../registros/registro-diario.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { Color } from '../colores/color.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { BaseSemanalService } from './base-semanal.service';
import { isCurrentOrFutureWeek } from '../common/iso-week.util';
import { buildRegistroSeeds } from '../semanas/registro-seeds.util';

/**
 * Mantiene los registros diarios de las semanas ACTUAL y FUTURAS en sincronía
 * con las asignaciones de colores de cada responsable.
 *
 * Las semanas pasadas NO se tocan: conservan su histórico tal cual.
 */
@Injectable()
export class SemanaReconciliationService {
  constructor(
    @InjectRepository(Semana)
    private readonly semanaRepo: Repository<Semana>,
    @InjectRepository(RegistroDiario)
    private readonly registroRepo: Repository<RegistroDiario>,
    @InjectRepository(ResponsableColor)
    private readonly respColorRepo: Repository<ResponsableColor>,
    private readonly configuracionService: ConfiguracionService,
    private readonly baseSemanalService: BaseSemanalService,
  ) {}

  /**
   * Reconcilia las semanas actual y futuras de un responsable para que sus
   * registros diarios reflejen exactamente los colores activos que tiene
   * asignados: agrega los que falten y elimina los que ya no correspondan.
   */
  async reconcileResponsable(responsableId: string): Promise<void> {
    const semanas = (await this.semanaRepo.find({ where: { responsableId } }))
      .filter((s) => isCurrentOrFutureWeek(s.anio, s.numeroSemana));
    if (semanas.length === 0) return;

    const asignaciones = await this.respColorRepo.find({
      where: { responsableId },
      relations: ['color'],
    });
    const coloresAsignados: Color[] = asignaciones
      .map((a) => a.color)
      .filter((c): c is Color => !!c && c.activo);
    const asignadoPorId = new Map(coloresAsignados.map((c) => [c.id, c]));

    const divisorGlobal = await this.configuracionService.getTallosPorCaja();

    for (const semana of semanas) {
      const existentes = await this.registroRepo.find({
        where: { semanaId: semana.id },
      });
      const colorIdsExistentes = new Set(existentes.map((r) => r.colorId));

      // 1. Agregar registros de colores asignados que aún no existen en la semana
      const nuevos: RegistroDiario[] = [];
      for (const color of coloresAsignados) {
        if (colorIdsExistentes.has(color.id)) continue;
        const seeds = buildRegistroSeeds(
          semana.id,
          semana.fechaInicio,
          color.id,
          color.tallosPorCaja ?? divisorGlobal,
        );
        nuevos.push(...seeds.map((s) => this.registroRepo.create(s)));
      }
      if (nuevos.length > 0) await this.registroRepo.save(nuevos);

      // 2. Eliminar registros de colores que ya no están asignados (o inactivos)
      const colorIdsAEliminar = [...colorIdsExistentes].filter(
        (id) => !asignadoPorId.has(id),
      );
      if (colorIdsAEliminar.length > 0) {
        await this.registroRepo.delete({
          semanaId: semana.id,
          colorId: In(colorIdsAEliminar),
        });
        // Reflejar la baja en la base semanal de cada color afectado
        for (const colorId of colorIdsAEliminar) {
          await this.baseSemanalService.recalcular(
            colorId,
            semana.id,
            semana.numeroSemana,
            semana.anio,
          );
        }
      }
    }
  }
}
