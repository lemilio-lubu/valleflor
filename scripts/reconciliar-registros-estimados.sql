-- Reconciliación de colores.codigo / colores.nombre_original con Estimados2026.
-- Match principal por PAR producto+variedad (normalizado).
-- Casos excepcionales (PARAMO × AZUL / BLACK / CELESTE): match por producto+variedad+color.
-- NO modifica producto / variedad / color.
-- Transaccional: el runner (reconciliar-registros.sh) decide COMMIT (APPLY=1) o ROLLBACK (dry-run).
--
-- Placeholders que el runner sustituye con sed:
--   __BACKUP_TBL__  = nombre de la tabla de respaldo (ej. colores_backup_registros_20260603_120000)
--   __CSV_PATH__    = ruta absoluta al CSV fuente
--   __SNAP_PATH__   = ruta absoluta del snapshot CSV de respaldo
--
-- Normalización: upper(regexp_replace(btrim(x), '\s+', ' ', 'g'))

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- ===== 1) Cargar CSV fuente a tabla temporal =====
CREATE TEMP TABLE est_raw (
  fila     int,
  codigo   text,
  nombre   text,
  producto text,
  variedad text,
  color    text
) ON COMMIT DROP;

\copy est_raw FROM '__CSV_PATH__' WITH (FORMAT csv, HEADER true)

-- ===== 2) Normalizar lado CSV =====
CREATE TEMP TABLE est_n ON COMMIT DROP AS
SELECT
  upper(regexp_replace(btrim(producto), '\s+', ' ', 'g')) AS p,
  upper(regexp_replace(btrim(variedad), '\s+', ' ', 'g')) AS v,
  upper(regexp_replace(btrim(color),    '\s+', ' ', 'g')) AS c,
  NULLIF(btrim(codigo), '') AS codigo,
  NULLIF(btrim(nombre), '') AS nombre_original
FROM est_raw;

CREATE INDEX ON est_n (p, v);
CREATE INDEX ON est_n (p, v, c);

-- ===== 3) Backup del estado actual (tabla persistente + snapshot CSV offline) =====
CREATE TABLE __BACKUP_TBL__ AS
SELECT id, codigo, nombre_original FROM colores;

\copy (SELECT c.id, p.nombre AS producto, v.nombre AS variedad, c.nombre AS color, c.codigo, c.nombre_original, c.activo FROM colores c JOIN variedades v ON v.id=c.variedad_id JOIN productos p ON p.id=v.producto_id ORDER BY p.nombre, v.nombre, c.nombre) TO '__SNAP_PATH__' WITH (FORMAT csv, HEADER true)

-- ===== 4) Vista normalizada del lado BD (activos + inactivos) =====
CREATE TEMP TABLE col_n ON COMMIT DROP AS
SELECT
  c.id,
  c.codigo,
  c.nombre_original,
  upper(regexp_replace(btrim(p.nombre), '\s+', ' ', 'g')) AS p,
  upper(regexp_replace(btrim(v.nombre), '\s+', ' ', 'g')) AS v,
  upper(regexp_replace(btrim(c.nombre), '\s+', ' ', 'g')) AS c
FROM colores c
JOIN variedades v ON v.id = c.variedad_id
JOIN productos  p ON p.id = v.producto_id;

CREATE INDEX ON col_n (p, v);
CREATE INDEX ON col_n (p, v, c);

-- ===== 5) Combinaciones excepcionales (requieren match por p+v+c) =====
-- Son los únicos pares (producto, variedad) con más de una fila en el CSV.
CREATE TEMP TABLE excepciones (p text, v text) ON COMMIT DROP;
INSERT INTO excepciones (p, v) VALUES
  ('PARAMO', 'AZUL'),
  ('PARAMO', 'BLACK'),
  ('PARAMO', 'CELESTE');

-- ===== 6) Tabla de resolución: asigna (new_codigo, new_nombre) a cada color de BD =====
--   6a) Excepcionales → match por (p, v, c)
--   6b) Normales      → match por (p, v)  [único CSV por par, verificado previamente]
CREATE TEMP TABLE match_resolved ON COMMIT DROP AS

  -- 6a) Excepcionales: match por triple (p, v, c)
  SELECT cn.id,
         e.codigo          AS new_codigo,
         e.nombre_original AS new_nombre
  FROM col_n cn
  JOIN excepciones ex ON (cn.p = ex.p AND cn.v = ex.v)
  JOIN est_n       e  ON (e.p  = cn.p AND e.v  = cn.v AND e.c = cn.c)

  UNION ALL

  -- 6b) Normales: match por par (p, v)
  SELECT cn.id,
         e.codigo          AS new_codigo,
         e.nombre_original AS new_nombre
  FROM col_n cn
  JOIN est_n e ON (e.p = cn.p AND e.v = cn.v)
  WHERE NOT EXISTS (
    SELECT 1 FROM excepciones ex WHERE ex.p = cn.p AND ex.v = cn.v
  );

CREATE INDEX ON match_resolved (id);

-- ===== Conteos PRE (antes de aplicar) para el reporte =====
\echo '== CONTEO PREVISTO =='
SELECT 'UPDATE (match, cambian)'              AS clase, count(*)
FROM match_resolved mr
JOIN col_n cn ON cn.id = mr.id
WHERE (cn.codigo, cn.nombre_original) IS DISTINCT FROM (mr.new_codigo, mr.new_nombre)
UNION ALL
SELECT 'NULL (sin match en CSV, se limpian)', count(*)
FROM col_n cn
WHERE NOT EXISTS (SELECT 1 FROM match_resolved mr WHERE mr.id = cn.id)
  AND (cn.codigo IS NOT NULL OR cn.nombre_original IS NOT NULL)
UNION ALL
SELECT 'SKIP (ya igual / nada que hacer)',    count(*)
FROM col_n cn
LEFT JOIN match_resolved mr ON mr.id = cn.id
WHERE (mr.id IS NOT NULL
       AND (cn.codigo, cn.nombre_original) IS NOT DISTINCT FROM (mr.new_codigo, mr.new_nombre))
   OR (mr.id IS NULL
       AND cn.codigo IS NULL AND cn.nombre_original IS NULL)
UNION ALL
SELECT 'TOTAL colores BD', count(*) FROM col_n;

-- ===== Detalle: colores que se pondrán en NULL (posible pérdida de datos) =====
\echo ''
\echo '== COLORES QUE SE PONDRAN EN NULL (sin match en CSV) =='
SELECT cn.p AS producto, cn.v AS variedad, cn.c AS color,
       cn.codigo AS codigo_actual, cn.nombre_original AS nombre_actual
FROM col_n cn
WHERE NOT EXISTS (SELECT 1 FROM match_resolved mr WHERE mr.id = cn.id)
  AND (cn.codigo IS NOT NULL OR cn.nombre_original IS NOT NULL)
ORDER BY producto, variedad, color;

-- ===== Detalle: filas CSV que NO encuentran color en BD =====
\echo ''
\echo '== FILAS DEL CSV SIN MATCH EN BD (no se crea nada) =='

-- Normales sin match
SELECT e.p AS producto, e.v AS variedad, NULL::text AS color,
       e.codigo, e.nombre_original, 'normal (p+v)' AS modo_match
FROM est_n e
WHERE NOT EXISTS (SELECT 1 FROM excepciones ex WHERE ex.p = e.p AND ex.v = e.v)
  AND NOT EXISTS (SELECT 1 FROM col_n cn WHERE cn.p = e.p AND cn.v = e.v)

UNION ALL

-- Excepcionales sin match
SELECT e.p AS producto, e.v AS variedad, e.c AS color,
       e.codigo, e.nombre_original, 'excepcion (p+v+c)' AS modo_match
FROM est_n e
JOIN excepciones ex ON (ex.p = e.p AND ex.v = e.v)
WHERE NOT EXISTS (
    SELECT 1 FROM col_n cn WHERE cn.p = e.p AND cn.v = e.v AND cn.c = e.c
  )
ORDER BY producto, variedad;

-- ===== Detalle: triples duplicados en BD (mismo triple en >1 color, p.ej. por finca) =====
\echo ''
\echo '== TRIPLES DUPLICADOS EN BD (mismo codigo se aplica a N filas) =='
SELECT p AS producto, v AS variedad, c AS color, count(*) AS n_colores
FROM col_n
GROUP BY p, v, c
HAVING count(*) > 1
ORDER BY n_colores DESC, producto, variedad, color;

-- ===== Detalle: pares CSV ambiguos FUERA de excepciones (alerta de integridad) =====
\echo ''
\echo '== PARES CSV AMBIGUOS FUERA DE EXCEPCIONES (deberian declararse excepciones) =='
SELECT e.p AS producto, e.v AS variedad, count(*) AS n_filas_csv
FROM est_n e
WHERE NOT EXISTS (SELECT 1 FROM excepciones ex WHERE ex.p = e.p AND ex.v = e.v)
GROUP BY e.p, e.v
HAVING count(*) > 1
ORDER BY n_filas_csv DESC, producto, variedad;

-- ===== 7) APLICAR: UPDATE de registros que cambian =====
UPDATE colores tgt
SET codigo          = mr.new_codigo,
    nombre_original = mr.new_nombre
FROM match_resolved mr
JOIN col_n cn ON cn.id = mr.id
WHERE tgt.id = mr.id
  AND (cn.codigo, cn.nombre_original) IS DISTINCT FROM (mr.new_codigo, mr.new_nombre);

-- ===== 8) APLICAR: Limpiar colores sin match en CSV =====
UPDATE colores tgt
SET codigo          = NULL,
    nombre_original = NULL
FROM col_n cn
WHERE tgt.id = cn.id
  AND NOT EXISTS (SELECT 1 FROM match_resolved mr WHERE mr.id = cn.id)
  AND (cn.codigo IS NOT NULL OR cn.nombre_original IS NOT NULL);

-- ===== Conteo POST (verificación dentro de la misma transacción) =====
\echo ''
\echo '== ESTADO POST (dentro de la transaccion) =='
SELECT count(*)               AS total,
       count(codigo)          AS con_codigo,
       count(nombre_original) AS con_nombre_original
FROM colores;

-- El COMMIT o ROLLBACK lo añade el runner según APPLY.
