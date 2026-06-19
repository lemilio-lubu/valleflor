import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Configuracion } from './configuracion.entity';
import { Producto } from '../productos/producto.entity';

@Injectable()
export class ConfiguracionService {
  constructor(
    @InjectRepository(Configuracion)
    private readonly repo: Repository<Configuracion>,
    @InjectRepository(Producto)
    private readonly productoRepo: Repository<Producto>,
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
    const config = await this.get();
    config.tallosPorCaja = tallosPorCaja;
    const savedConfig = await this.repo.save(config);

    // Propagar la constante global a todos los productos para que el cálculo
    // dinámico en lectura tome este nuevo valor.
    await this.productoRepo.createQueryBuilder()
      .update(Producto)
      .set({
        tallosPorCaja: tallosPorCaja,
      })
      .execute();

    return savedConfig;
  }
}
