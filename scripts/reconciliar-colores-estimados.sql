-- Reconciliación de colores.codigo / colores.nombre_original con Estimados2026.
-- Match por terna producto+variedad+color (normalizada). NO modifica producto/variedad/color.
-- Transaccional: el runner (reconciliar-colores.sh) decide COMMIT (APPLY=1) o ROLLBACK (dry-run).
--
-- Placeholders que el runner (reconciliar-colores.sh) sustituye con sed:
--   __BACKUP_TBL__  = nombre de la tabla de respaldo (ej. colores_backup_20260603_120000)
--   __CSV_PATH__    = ruta absoluta al CSV fuente
--   __SNAP_PATH__   = ruta absoluta del snapshot CSV de respaldo
--
-- Normalización: upper(regexp_replace(btrim(x), '\s+', ' ', 'g'))

\set ON_ERROR_STOP on
\timing off

BEGIN;

-- 1) Cargar CSV fuente a tabla temporal
CREATE TEMP TABLE est_raw (
  fila     int,
  codigo   text,
  nombre   text,
  producto text,
  variedad text,
  color    text
) ON COMMIT DROP;

\copy est_raw FROM '__CSV_PATH__' WITH (FORMAT csv, HEADER true)

-- 2) Normalizar lado CSV
CREATE TEMP TABLE est_n ON COMMIT DROP AS
SELECT
  upper(regexp_replace(btrim(producto), '\s+', ' ', 'g')) AS p,
  upper(regexp_replace(btrim(variedad), '\s+', ' ', 'g')) AS v,
  upper(regexp_replace(btrim(color),    '\s+', ' ', 'g')) AS c,
  NULLIF(btrim(codigo), '') AS codigo,
  NULLIF(btrim(nombre), '') AS nombre_original
FROM est_raw;

CREATE INDEX ON est_n (p, v, c);

-- 3) Backup del estado actual (tabla persistente + snapshot CSV offline)
CREATE TABLE __BACKUP_TBL__ AS
SELECT id, codigo, nombre_original FROM colores;

\copy (SELECT c.id, p.nombre AS producto, v.nombre AS variedad, c.nombre AS color, c.codigo, c.nombre_original, c.activo FROM colores c JOIN variedades v ON v.id=c.variedad_id JOIN productos p ON p.id=v.producto_id ORDER BY p.nombre, v.nombre, c.nombre) TO '__SNAP_PATH__' WITH (FORMAT csv, HEADER true)

-- 4) Vista normalizada del lado BD (todos los colores: activos + inactivos)
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

CREATE INDEX ON col_n (p, v, c);

-- ===== Conteos PRE (antes de aplicar) para el reporte =====
\echo '== CONTEO PREVISTO =='
SELECT 'UPDATE (match, cambian)' AS clase, count(*)
FROM col_n cn JOIN est_n e ON (e.p,e.v,e.c)=(cn.p,cn.v,cn.c)
WHERE (cn.codigo, cn.nombre_original) IS DISTINCT FROM (e.codigo, e.nombre_original)
UNION ALL
SELECT 'NULL (sin match, se limpian)', count(*)
FROM col_n cn
WHERE NOT EXISTS (SELECT 1 FROM est_n e WHERE (e.p,e.v,e.c)=(cn.p,cn.v,cn.c))
  AND (cn.codigo IS NOT NULL OR cn.nombre_original IS NOT NULL)
UNION ALL
SELECT 'SKIP (ya igual / nada que hacer)', count(*)
FROM col_n cn
WHERE (
        EXISTS (SELECT 1 FROM est_n e WHERE (e.p,e.v,e.c)=(cn.p,cn.v,cn.c))
        AND NOT EXISTS (SELECT 1 FROM est_n e WHERE (e.p,e.v,e.c)=(cn.p,cn.v,cn.c)
                        AND (cn.codigo,cn.nombre_original) IS DISTINCT FROM (e.codigo,e.nombre_original))
      )
   OR (
        NOT EXISTS (SELECT 1 FROM est_n e WHERE (e.p,e.v,e.c)=(cn.p,cn.v,cn.c))
        AND cn.codigo IS NULL AND cn.nombre_original IS NULL
      )
UNION ALL
SELECT 'TOTAL colores BD', count(*) FROM col_n;

-- ===== Detalle: colores que se pondrán en NULL (revisar posible pérdida) =====
\echo ''
\echo '== COLORES QUE SE PONDRAN EN NULL (codigo actual -> NULL) =='
SELECT cn.p AS producto, cn.v AS variedad, cn.c AS color, cn.codigo AS codigo_actual, cn.nombre_original AS nombre_actual
FROM col_n cn
WHERE NOT EXISTS (SELECT 1 FROM est_n e WHERE (e.p,e.v,e.c)=(cn.p,cn.v,cn.c))
  AND (cn.codigo IS NOT NULL OR cn.nombre_original IS NOT NULL)
ORDER BY producto, variedad, color;

-- ===== Detalle: filas del CSV que NO encuentran color en BD =====
\echo ''
\echo '== FILAS DEL CSV SIN MATCH EN BD (no se crea nada) =='
SELECT e.p AS producto, e.v AS variedad, e.c AS color, e.codigo, e.nombre_original
FROM est_n e
WHERE NOT EXISTS (SELECT 1 FROM col_n cn WHERE (cn.p,cn.v,cn.c)=(e.p,e.v,e.c))
ORDER BY producto, variedad, color;

-- ===== Detalle: triples duplicados en BD (mismo triple en >1 color, p.ej. por finca) =====
\echo ''
\echo '== TRIPLES DUPLICADOS EN BD (mismo codigo se aplica a N filas) =='
SELECT p AS producto, v AS variedad, c AS color, count(*) AS n_colores
FROM col_n
GROUP BY p, v, c
HAVING count(*) > 1
ORDER BY n_colores DESC, producto, variedad, color;

-- ===== 4) APLICAR: UPDATE match =====
UPDATE colores tgt
SET codigo = e.codigo,
    nombre_original = e.nombre_original
FROM col_n cn
JOIN est_n e ON (e.p,e.v,e.c) = (cn.p,cn.v,cn.c)
WHERE tgt.id = cn.id
  AND (cn.codigo, cn.nombre_original) IS DISTINCT FROM (e.codigo, e.nombre_original);

-- ===== 5) APLICAR: UPDATE null (sin match) =====
UPDATE colores tgt
SET codigo = NULL,
    nombre_original = NULL
FROM col_n cn
WHERE tgt.id = cn.id
  AND NOT EXISTS (SELECT 1 FROM est_n e WHERE (e.p,e.v,e.c)=(cn.p,cn.v,cn.c))
  AND (cn.codigo IS NOT NULL OR cn.nombre_original IS NOT NULL);

-- ===== Conteo POST (verificación dentro de la misma transacción) =====
\echo ''
\echo '== ESTADO POST (dentro de la transaccion) =='
SELECT count(*) AS total,
       count(codigo) AS con_codigo,
       count(nombre_original) AS con_nombre_original
FROM colores;

-- El COMMIT o ROLLBACK lo añade el runner según APPLY.
