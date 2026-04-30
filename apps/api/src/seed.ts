import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User, UserRole } from './users/user.entity';
import { Finca } from './fincas/finca.entity';
import { Responsable } from './responsables/responsable.entity';
import { Producto } from './productos/producto.entity';
import { Variedad } from './variedades/variedad.entity';
import { Color } from './colores/color.entity';
import { Semana } from './semanas/semana.entity';
import { RegistroDiario } from './registros/registro-diario.entity';
import { BaseSemanal } from './base-semanal/base-semanal.entity';

const seedData = {
  "fincas_responsables": {
    "LIBERTAD": ["ANDRES"],
    "PIFO": ["ANTONIO", "CARLA", "GABRIELA"],
    "PUEMBO": ["OSWALDO"],
    "ASCAZUBI": ["DAVID"],
    "BOSQUE": ["VERONICA"],
    "I+D": ["VANESSA"],
    "LOMA FLOWERS": ["MELISSA"]
  },
  "fincas_productos": {
    "LIBERTAD": ["A STAR CLASSIC SC", "A STAR HAT SC", "ANEMONE", "CUSHION", "DAISY", "DISBUD", "POMPON"],
    "PIFO": ["A STAR CLASSIC SC", "A STAR HAT SC", "ANEMONE", "CUSHION", "DAISY", "DISBUD", "POMPON"],
    "PUEMBO": ["A STAR CLASSIC SC", "A STAR HAT SC", "ANEMONE", "CUSHION", "DAISY", "DISBUD", "POMPON"],
    "ASCAZUBI": ["A STAR CLASSIC SC", "A STAR HAT SC", "ANEMONE", "CUSHION", "DAISY", "DISBUD", "POMPON"],
    "BOSQUE": ["A STAR CLASSIC SC", "A STAR HAT SC", "ANEMONE", "CUSHION", "DAISY", "DISBUD", "POMPON"],
    "I+D": ["A STAR CLASSIC SC", "A STAR HAT SC", "ANEMONE", "CUSHION", "DAISY", "DISBUD", "POMPON"],
    "LOMA FLOWERS": ["A STAR CLASSIC SC", "A STAR HAT SC", "ANEMONE", "CUSHION", "DAISY", "DISBUD", "POMPON"]
  },
  "productos_variedades": {
    "A STAR CLASSIC SC": ["SYMPHONY", "DUNLUCE", "CIRINA", "CALIPSO", "BALTICA", "BACARDI", "RILLO", "TENERIFE", "RAPIDO", "RINGO", "STALLION", "MEMPHIS", "MARTINI", "PING PONG", "JORDI", "EURO", "ZIDANE WHITE", "FROSTY", "CASABLANCA"],
    "A STAR HAT SC": ["REAGAN", "SULTAN", "JORDI", "RINGO", "MEMPHIS", "STALLION"],
    "ANEMONE": ["PINK", "WHITE", "BRONZE", "GREEN"],
    "CUSHION": ["ZEMBLA", "EURO", "BACARDI", "BALTICA", "RILLO", "CASABLANCA", "RAPIDO", "STALLION"],
    "DAISY": ["TEDCHA", "YOKO ONO", "BALTICA", "PINK DAISY", "WHITE DAISY"],
    "DISBUD": ["ALTAIR", "PIP", "RINGO", "MEMPHIS", "STALLION", "ZIDANE"],
    "POMPON": ["PING PONG", "YOKO ONO", "TEDCHA", "RAPIDO", "BACARDI"]
  },
  "variedades_colores": {
    "SYMPHONY": ["WHITE"], "DUNLUCE": ["PURPLE"], "CIRINA": ["PINK"], "CALIPSO": ["LIGHT PURPLE"],
    "BALTICA": ["WHITE"], "BACARDI": ["WHITE"], "RILLO": ["YELLOW"], "TENERIFE": ["WHITE"],
    "RAPIDO": ["YELLOW"], "RINGO": ["RED"], "STALLION": ["BRONZE"], "MEMPHIS": ["PURPLE"],
    "MARTINI": ["PINK"], "PING PONG": ["YELLOW"], "JORDI": ["WHITE"], "EURO": ["WHITE"],
    "ZIDANE WHITE": ["WHITE"], "FROSTY": ["WHITE"], "CASABLANCA": ["CREAM"], "REAGAN": ["WHITE"],
    "SULTAN": ["BRONZE"], "PINK": ["PINK"], "WHITE": ["WHITE"], "BRONZE": ["BRONZE"],
    "GREEN": ["GREEN"], "ZEMBLA": ["WHITE"], "TEDCHA": ["YELLOW"], "YOKO ONO": ["GREEN"],
    "PINK DAISY": ["PINK"], "WHITE DAISY": ["WHITE"], "ALTAIR": ["WHITE"], "PIP": ["PINK"],
    "ZIDANE": ["WHITE"]
  }
};

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'floricultura_db',
  entities: [User, Finca, Responsable, Producto, Variedad, Color, Semana, RegistroDiario, BaseSemanal],
  synchronize: false,
});

async function runSeed() {
  await AppDataSource.initialize();
  console.log('🌱 Connected to database.');

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const userRepo = queryRunner.manager.getRepository(User);
    const fincaRepo = queryRunner.manager.getRepository(Finca);
    const responsableRepo = queryRunner.manager.getRepository(Responsable);
    const productoRepo = queryRunner.manager.getRepository(Producto);
    const variedadRepo = queryRunner.manager.getRepository(Variedad);
    const colorRepo = queryRunner.manager.getRepository(Color);

    // 1. Create Admin User
    let adminUser = await userRepo.findOne({ where: { email: 'admin@villaflor.com' } });
    if (!adminUser) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      adminUser = userRepo.create({
        email: 'admin@villaflor.com',
        passwordHash,
        role: UserRole.ADMIN,
      });
      await userRepo.save(adminUser);
      console.log('✅ Created admin user: admin@villaflor.com / admin123');
    } else {
      console.log('✅ Admin user already exists.');
    }

    // 2. Iterate through Fincas and Responsables
    for (const [fincaNombre, responsables] of Object.entries(seedData.fincas_responsables)) {
      let finca = await fincaRepo.findOne({ where: { nombre: fincaNombre } });
      if (!finca) {
        finca = fincaRepo.create({
          nombre: fincaNombre,
          adminId: adminUser.id,
        });
        await fincaRepo.save(finca);
        console.log(`✅ Created Finca: ${fincaNombre}`);
      }

      for (const respNombre of responsables) {
        const email = `${respNombre.toLowerCase()}@villaflor.com`;
        let user = await userRepo.findOne({ where: { email } });
        
        if (!user) {
          const passwordHash = await bcrypt.hash('password123', 10);
          user = userRepo.create({
            email,
            passwordHash,
            role: UserRole.RESPONSABLE,
          });
          await userRepo.save(user);
          console.log(`  ✅ Created User: ${email} / password123`);
        }

        let responsable = await responsableRepo.findOne({ where: { userId: user.id, fincaId: finca.id } });
        if (!responsable) {
          responsable = responsableRepo.create({
            nombre: respNombre,
            userId: user.id,
            fincaId: finca.id,
          });
          await responsableRepo.save(responsable);
          console.log(`  ✅ Linked Responsable ${respNombre} to ${fincaNombre}`);
        }
      }
    }

    // 3. Iterate through Productos, Variedades, Colores
    for (const [fincaNombre, productos] of Object.entries(seedData.fincas_productos)) {
      const finca = await fincaRepo.findOne({ where: { nombre: fincaNombre } });
      if (!finca) continue;

      for (const prodNombre of productos) {
        let producto = await productoRepo.findOne({ where: { nombre: prodNombre, fincaId: finca.id } });
        if (!producto) {
          producto = productoRepo.create({
            nombre: prodNombre,
            fincaId: finca.id,
          });
          await productoRepo.save(producto);
        }

        const variedades = seedData.productos_variedades[prodNombre as keyof typeof seedData.productos_variedades] || [];
        for (const varNombre of variedades) {
          let variedad = await variedadRepo.findOne({ where: { nombre: varNombre, productoId: producto.id } });
          if (!variedad) {
            variedad = variedadRepo.create({
              nombre: varNombre,
              productoId: producto.id,
            });
            await variedadRepo.save(variedad);
          }

          const colores = seedData.variedades_colores[varNombre as keyof typeof seedData.variedades_colores] || [];
          for (const colNombre of colores) {
            let color = await colorRepo.findOne({ where: { nombre: colNombre, variedadId: variedad.id } });
            if (!color) {
              color = colorRepo.create({
                nombre: colNombre,
                variedadId: variedad.id,
              });
              await colorRepo.save(color);
            }
          }
        }
      }
      console.log(`✅ Seeded catalog for Finca: ${fincaNombre}`);
    }

    await queryRunner.commitTransaction();
    console.log('🚀 Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding, rolling back...', error);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

runSeed();
