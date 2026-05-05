import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Semana } from './semana.entity';
import { RegistroDiario, DiaSemana } from '../registros/registro-diario.entity';
import { Color } from '../colores/color.entity';
import { Responsable } from '../responsables/responsable.entity';
import { ResponsableColor } from '../responsables/responsable-color.entity';
import { ConfiguracionService } from '../configuracion/configuracion.service';
import { JwtUser } from '../auth/types/jwt-user.type';
import { CreateSemanaDto } from './dto/create-semana.dto';

// Maps JS Date.getUTCDay() (0=Sun … 6=Sat) to DiaSemana enum
const DIA_BY_JS_DAY: DiaSemana[] = [
  DiaSemana.DOMINGO,
  DiaSemana.LUNES,
  DiaSemana.MARTES,
  DiaSemana.MIERCOLES,
  DiaSemana.JUEVES,
  DiaSemana.VIERNES,
  DiaSemana.SABADO,
];

const DIA_SORT_ORDER: Record<DiaSemana, number> = {
  [DiaSemana.DOMINGO]: 0,
  [DiaSemana.LUNES]: 1,
  [DiaSemana.MARTES]: 2,
  [DiaSemana.MIERCOLES]: 3,
  [DiaSemana.JUEVES]: 4,
  [DiaSemana.VIERNES]: 5,
  [DiaSemana.SABADO]: 6,
};

export interface PlantillaRow {
  semanaNumero: number;
  anio: number;
  dia: DiaSemana;
  fecha: string;
  finca: string;
  responsable: string;
  producto: string;
  variedad: string;
  color: string;
  colorId: string;
  registroId: string;
  cajas: number;
  divisorTallos: number;
  tallos: number;
}

@Injectable()
export class SemanasService {
  constructor(
    @InjectRepository(Semana)
    private readonly semanaRepo: Repository<Semana>,
    @InjectRepository(RegistroDiario)
    private readonly registroRepo: Repository<RegistroDiario>,
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
    @InjectRepository(Responsable)
    private readonly responsableRepo: Repository<Responsable>,
    @InjectRepository(ResponsableColor)
    private readonly respColorRepo: Repository<ResponsableColor>,
    private readonly configuracionService: ConfiguracionService,
  ) {}

  private async getResponsable(userId: string): Promise<Responsable> {
    const responsable = await this.responsableRepo.findOne({
      where: { userId },
      relations: ['finca'],
    });
    if (!responsable) {
      throw new ForbiddenException('No eres responsable de ninguna finca');
    }
    return responsable;
  }

  async create(dto: CreateSemanaDto, user: JwtUser): Promise<Semana> {
    const responsable = await this.getResponsable(user.id);

    // 1. Obtener colores asignados al responsable
    const asignaciones = await this.respColorRepo.find({
      where: { responsableId: responsable.id },
      relations: ['color'],
    });
    const colores = asignaciones.map((a) => a.color);

    // 2. Crear la semana
    const semana = await this.semanaRepo.save(
      this.semanaRepo.create({
        numeroSemana: dto.numeroSemana,
        anio: dto.anio,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin,
        responsableId: responsable.id,
      }),
    );

    // 3. Generar 7 registros por color (uno por día de la semana)
    const tallosPorCaja = await this.configuracionService.getTallosPorCaja();
    const fechaBase = new Date(dto.fechaInicio + 'T00:00:00Z');
    const registros: RegistroDiario[] = [];

    for (const color of colores) {
      for (let i = 0; i < 7; i++) {
        const d = new Date(fechaBase);
        d.setUTCDate(d.getUTCDate() + i);
        const dia = DIA_BY_JS_DAY[d.getUTCDay()];
        const fecha = d.toISOString().split('T')[0];

        registros.push(
          this.registroRepo.create({
            semanaId: semana.id,
            colorId: color.id,
            dia,
            fecha,
            cajas: 0,
            divisorTallos: tallosPorCaja,
            tallos: 0,
          }),
        );
      }
    }

    await this.registroRepo.save(registros);

    return this.semanaRepo.findOne({
      where: { id: semana.id },
      relations: ['registros'],
    });
  }

  async findAll(
    user: JwtUser,
    page: number,
    limit: number,
  ): Promise<{
    data: Semana[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const responsable = await this.getResponsable(user.id);

    const [data, total] = await this.semanaRepo.findAndCount({
      where: { responsableId: responsable.id },
      order: { anio: 'DESC', numeroSemana: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Semana> {
    const semana = await this.semanaRepo.findOne({
      where: { id },
      relations: [
        'responsable',
        'registros',
        'registros.color',
        'registros.color.variedad',
        'registros.color.variedad.producto',
      ],
    });
    if (!semana) throw new NotFoundException(`Semana ${id} no encontrada`);
    return semana;
  }

  async findPlantilla(id: string): Promise<PlantillaRow[]> {
    const semana = await this.semanaRepo.findOne({
      where: { id },
      relations: [
        'responsable',
        'responsable.finca',
        'responsable.user',
        'registros',
        'registros.color',
        'registros.color.variedad',
        'registros.color.variedad.producto',
      ],
    });
    if (!semana) throw new NotFoundException(`Semana ${id} no encontrada`);

    const rows: PlantillaRow[] = semana.registros.map((registro) => ({
      semanaNumero: semana.numeroSemana,
      anio: semana.anio,
      dia: registro.dia,
      fecha: registro.fecha,
      finca: semana.responsable.finca.nombre,
      responsable: semana.responsable.user?.nombre ?? semana.responsable.user?.email ?? '',
      producto: registro.color.variedad.producto.nombre,
      variedad: registro.color.variedad.nombre,
      color: registro.color.nombre,
      colorId: registro.colorId,
      registroId: registro.id,
      cajas: Number(registro.cajas),
      divisorTallos: registro.divisorTallos,
      tallos: Number(registro.tallos),
    }));

    return rows.sort((a, b) => {
      const diaOrd = DIA_SORT_ORDER[a.dia] - DIA_SORT_ORDER[b.dia];
      if (diaOrd !== 0) return diaOrd;
      const prodOrd = a.producto.localeCompare(b.producto);
      if (prodOrd !== 0) return prodOrd;
      const varOrd = a.variedad.localeCompare(b.variedad);
      if (varOrd !== 0) return varOrd;
      return a.color.localeCompare(b.color);
    });
  }

  async remove(id: string, user: JwtUser): Promise<void> {
    const semana = await this.semanaRepo.findOne({ where: { id } });
    if (!semana) throw new NotFoundException(`Semana ${id} no encontrada`);
    const responsable = await this.getResponsable(user.id);
    if (semana.responsableId !== responsable.id) {
      throw new ForbiddenException('No puedes eliminar una semana que no es tuya');
    }
    await this.registroRepo.delete({ semanaId: id });
    await this.semanaRepo.remove(semana);
  }
}
