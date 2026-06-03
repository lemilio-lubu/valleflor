#!/usr/bin/env bash
# Reconcilia colores.codigo / nombre_original con docs/estimados2026-registros.csv
#
# Uso:
#   DATABASE_URL=postgres://...  ./scripts/reconciliar-colores.sh           # dry-run (ROLLBACK)
#   DATABASE_URL=postgres://...  APPLY=1 ./scripts/reconciliar-colores.sh   # aplica (COMMIT)
#
# Nunca hardcodear credenciales: se leen de DATABASE_URL.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Cargar credenciales desde archivo local gitignored si existe (no se commitea).
ENV_FILE="$ROOT/scripts/.env.local"
if [[ -f "$ENV_FILE" ]]; then
  set -a; source "$ENV_FILE"; set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: define DATABASE_URL (en el entorno o en scripts/.env.local)" >&2
  exit 1
fi

CSV="$ROOT/docs/estimados2026-registros.csv"
SQL="$ROOT/scripts/reconciliar-colores-estimados.sql"

if [[ ! -f "$CSV" ]]; then echo "ERROR: no existe $CSV" >&2; exit 1; fi
if [[ ! -f "$SQL" ]]; then echo "ERROR: no existe $SQL" >&2; exit 1; fi

TS="$(date +%Y%m%d_%H%M%S)"
BACKUP_TBL="colores_backup_${TS}"
SNAP="$ROOT/docs/backups/colores-snapshot-${TS}.csv"
REPORT="$ROOT/docs/reporte-reconciliacion-${TS}.md"
mkdir -p "$ROOT/docs/backups"

if [[ "${APPLY:-0}" == "1" ]]; then
  MODE="APPLY (COMMIT)"; FINAL="COMMIT;"
else
  MODE="DRY-RUN (ROLLBACK)"; FINAL="ROLLBACK;"
fi

# Combinar el SQL principal + el cierre de transacción en un único archivo,
# para que toda la transacción y las tablas TEMP vivan en la misma sesión psql.
COMBINED="$(mktemp -t reconciliar-XXXX.sql)"
trap 'rm -f "$COMBINED"' EXIT
# Sustituir placeholders de rutas/tabla (delimitador | para no chocar con / de rutas).
sed -e "s|__CSV_PATH__|$CSV|g" \
    -e "s|__SNAP_PATH__|$SNAP|g" \
    -e "s|__BACKUP_TBL__|$BACKUP_TBL|g" \
    "$SQL" > "$COMBINED"
printf '\n%s\n' "$FINAL" >> "$COMBINED"

echo "Modo:        $MODE"
echo "CSV:         $CSV"
echo "Snapshot:    $SNAP"
echo "Reporte:     $REPORT"
echo "Backup tbl:  $BACKUP_TBL (solo persiste si COMMIT)"
echo "---------------------------------------------"

{
  echo "# Reporte de reconciliación de colores"
  echo ""
  echo "- Fecha: $TS"
  echo "- Modo: **$MODE**"
  echo "- CSV fuente: \`docs/estimados2026-registros.csv\`"
  echo "- Snapshot offline: \`docs/backups/colores-snapshot-${TS}.csv\`"
  echo "- Tabla backup: \`$BACKUP_TBL\` (solo si APPLY)"
  echo ""
  echo '```'
} > "$REPORT"

# -q silencia "BEGIN/UPDATE n"? no: queremos ver los UPDATE counts. Usamos salida normal.
psql "$DATABASE_URL" \
  -v ON_ERROR_STOP=1 \
  -P pager=off \
  -f "$COMBINED" 2>&1 | tee -a "$REPORT"

echo '```' >> "$REPORT"

echo "---------------------------------------------"
echo "Listo ($MODE). Reporte: $REPORT"
if [[ "${APPLY:-0}" != "1" ]]; then
  echo "Esto fue DRY-RUN: nada se modificó. Para aplicar: APPLY=1 $0"
fi
