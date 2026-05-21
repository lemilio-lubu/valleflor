import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './configuracion.entity';
import { Color } from '../colores/color.entity';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion)
    private readonly repo: Repository<Configuracion>,
    @InjectRepository(Color)
    private readonly colorRepo: Repository<Color>,
  ) {}

  async get(): Promise<Configuracion> {
    let config = await this.repo.findOne({ where: { id: 1 } });
    if (!config) {
      config = this.repo.create({ id: 1, tallosPorCaja: 400 });
      await this.repo.save(config);
    }
    return config;
  }

  async getTallosPorCaja(): Promise<number> {
    const config = await this.get();
    return config.tallosPorCaja;
  }

  async update(tallosPorCaja: number): Promise<Configuracion> {
    let config = await this.get();
    config.tallosPorCaja = tallosPorCaja;
    const savedConfig = await this.repo.save(config);

    // Propagar la constante global a todos los colores para que el cálculo
    // dinámico en lectura tome este nuevo valor.
    await this.colorRepo.createQueryBuilder()
      .update(Color)
      .set({
        tallosPorCaja: tallosPorCaja,
      })
      .execute();

    return savedConfig;
  }
}
