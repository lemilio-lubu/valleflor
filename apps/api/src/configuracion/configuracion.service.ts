import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './configuracion.entity';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion)
    private readonly repo: Repository<Configuracion>,
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
    return this.repo.save(config);
  }
}
