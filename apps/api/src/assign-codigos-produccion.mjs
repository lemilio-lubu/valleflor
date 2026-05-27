/**
 * Script: assign-codigos-produccion.mjs
 * Autentica contra la API de producción, recorre todos los colores
 * y actualiza codigo + nombreOriginal según la tabla de asignación.
 *
 * Uso:
 *   node assign-codigos-produccion.mjs <email> <password>
 */

const BASE = 'https://valleflor-production.up.railway.app/api/v1';

// ── Tabla de asignación ─────────────────────────────────────────────────────
// formato: [producto, variedad, color, codigo, nombreOriginal]
// codigo '0' → null  |  nombreOriginal '' → null
const ASIGNACIONES = [
  // A STAR CARNIVAL CLASSIC
  ['A STAR CARNIVAL CLASSIC','CALIPSO','CALIPSO','002750','Carnival Calipso'],
  ['A STAR CARNIVAL CLASSIC','CIRINA','CIRINA','001890','Carnival Pink Cirina'],
  ['A STAR CARNIVAL CLASSIC','DUNLUCE','PURPLE','002459','Carnival Purple Dunluce'],
  ['A STAR CARNIVAL CLASSIC','SYMPHONY','WHITE','001888','Carnival White Symphony'],
  // A STAR CLASSIC SC
  ['A STAR CLASSIC SC','CALIPSO','CALIPSO','002763','Aster Calipso clasico'],
  ['A STAR CLASSIC SC','CIRINA','CIRINA','001709','Aster Pink Cirina'],
  ['A STAR CLASSIC SC','DUNLUCE','DUNLUCE','002434','Aster Purple Dunluce'],
  ['A STAR CLASSIC SC','SYMPHONY','WHITE','001717','Aster White Simphony'],
  // A STAR DUPLO CARNIVAL
  ['A STAR DUPLO CARNIVAL','FANTASY','FANTASY','002569','Carnival Duplo Fantasy'],
  ['A STAR DUPLO CARNIVAL','PRIMAVERA','PRIMAVERA','002448','Carnival Duplo Primavera'],
  ['A STAR DUPLO CARNIVAL','SNOWBALL','SNOWBALL','0',''],
  ['A STAR DUPLO CARNIVAL','ULTRA','ULTRA','002447','Carnival Duplo Ultra'],
  // A STAR PICCOLINO
  ['A STAR PICCOLINO','AMATISTA','PURPLE','002800','Aster Piccolino Amatista'],
  ['A STAR PICCOLINO','ARI','WHITE','002660','Aster Piccolino Ari'],
  ['A STAR PICCOLINO','CEREZA','HOT PINK','002801','Aster Piccolino Cereza'],
  ['A STAR PICCOLINO','ELECTRA','LIGHT PURPLE','002661','Aster Piccolino Electra'],
  ['A STAR PICCOLINO','NEVADO','WHITE','002799','Aster Piccolino Nevado'],
  ['A STAR PICCOLINO','ROSA','PINK','002662','Aster Piccolino Rosa'],
  ['A STAR PICCOLINO','TOPACIO','PINK','002802','Aster Piccolino Topacio'],
  ['A STAR PICCOLINO','ARI','ARI','002660','Aster Piccolino Ari'],
  // ALSTILBE
  ['ALSTILBE','BLACK PEARLS','PURPLE','0',''],
  ['ALSTILBE','CARDINAL','RED','0',''],
  ['ALSTILBE','HEART AND SOUL','PINK','0',''],
  ['ALSTILBE','ICE CRAM','PINK','0',''],
  ['ALSTILBE','IVORY PEARLS','WHITE','0',''],
  ['ALSTILBE','LOWLANDS WHITE','WHITE','0',''],
  ['ALSTILBE','MIGHTY RED QUIN','RED','0',''],
  // ALSTROEMERIA PERFECTION
  ['ALSTROEMERIA  PERFECTION','BICOLOR','BICOLOR','001964','Perfection Sylvan'],
  ['ALSTROEMERIA  PERFECTION','HOT PEPPER','ORANGE','002110','Perfeccion Hot Pepper'],
  ['ALSTROEMERIA  PERFECTION','HOT PINK','HOT PINK','002454','Perfection Lucia'],
  ['ALSTROEMERIA  PERFECTION','LAVENDER','LAVENDER','002495','Perfeccion Okinawa'],
  ['ALSTROEMERIA  PERFECTION','ORANGE','ORANGE','002253','Perfeccion Jaffa'],
  ['ALSTROEMERIA  PERFECTION','PEACH','PEACH','002114','Perfection Dirty Dancing'],
  ['ALSTROEMERIA  PERFECTION','PINK','PINK','001970','Perfection Primadonna'],
  ['ALSTROEMERIA  PERFECTION','PURPLE','PURPLE','002492','Perfeccion Helena'],
  ['ALSTROEMERIA  PERFECTION','RED','RED','002265','Perfeccion Natalya'],
  ['ALSTROEMERIA  PERFECTION','WHITE','WHITE','002286','Perfection Frozen'],
  ['ALSTROEMERIA  PERFECTION','YELLOW','YELLOW','002456','Perfection Copacabana'],
  // ALSTROEMERIA PREMIUM
  ['ALSTROEMERIA  PREMIUM','BICOLOR','BICOLOR','001912','Alstroemeria Sylvan'],
  ['ALSTROEMERIA  PREMIUM','CREAM','YELLOW','002455','Alstroemeria Gold'],
  ['ALSTROEMERIA  PREMIUM','GREEN','GREEN','002998','Green'],
  ['ALSTROEMERIA  PREMIUM','HOT PINK','HOT PINK','001904','Alstroemeria Rome'],
  ['ALSTROEMERIA  PREMIUM','LAVENDER','LAVENDER','001940','Alstroemeria Okinawa'],
  ['ALSTROEMERIA  PREMIUM','ORANGE','ORANGE','002236','Alstroemeria Jaffa'],
  ['ALSTROEMERIA  PREMIUM','PINK','PINK','001958','Alstroemeria Pink Floyd'],
  ['ALSTROEMERIA  PREMIUM','PINOT','WHITE','001982','Alstroemeria Clear'],
  ['ALSTROEMERIA  PREMIUM','PURPLE','PURPLE','002482','Alstroemeria Helena'],
  ['ALSTROEMERIA  PREMIUM','RED','RED','001979','Alstroemeria Natalya'],
  ['ALSTROEMERIA  PREMIUM','T2109','PURPLE','002482','Alstroemeria Helena'],
  ['ALSTROEMERIA  PREMIUM','WHITE','WHITE','001982','Alstroemeria Clear'],
  ['ALSTROEMERIA  PREMIUM','YELLOW','YELLOW','002455','Alstroemeria Gold'],
  ['ALSTROEMERIA  PREMIUM','HOT PEPPER','ORANGE','002083','Alstroemeria Hot Pepper'],
  ['ALSTROEMERIA  PREMIUM','PEACH','PEACH','002486','Alstroemeria Intenz Salmon'],
  // ALSTROEMERIA NACIONAL
  ['ALSTROEMERIA NACIONAL','ASORTADO','ASORTADO','0',''],
  // BELLANDES
  ['BELLANDES','AZURE','AZURE','002477','Delphinium Royal Azurre'],
  ['BELLANDES','DARK','DARK','0',''],
  ['BELLANDES','LIGHT','LIGHT','001001','Delphinium Royal TC Light Blue'],
  ['BELLANDES','ROYAL WHITE','ROYAL WHITE','002180','Delphinium Royal White'],
  ['BELLANDES','LIGHT BLUE','LIGHT BLUE','002244','Delphinium Royal Kori'],
  ['BELLANDES','SUNSHINE','SUNSHINE','002997','sunshine'],
  // CARNIVAL SOLIDAGO
  ['CARNIVAL SOLIDAGO','GOLD','GOLD','001869','Carnival Solidago Gold'],
  ['CARNIVAL SOLIDAGO','GOLDEN GLORY','GOLDEN GLORY','003005','Carnvival Golden Glory'],
  ['CARNIVAL SOLIDAGO','TARAMBA','TARAMBA','002501','Carnvival Taramba'],
  // CLEMATIS
  ['CLEMATIS','E27 - VIOLET','VIOLETA','002792','Clematis e27'],
  ['CLEMATIS','H30-14','PURPURA','0',''],
  ['CLEMATIS','M18-14','PURPURA','0',''],
  ['CLEMATIS','M18-15','PURPURA','0',''],
  // CORTOS (todos sin código)
  ['CORTOS','APRICOT 50 CM','APRICOT','0',''],
  ['CORTOS','BLUE 50CM','BLUE','0',''],
  ['CORTOS','HOT PINK 50 CM','HOT PINK','0',''],
  ['CORTOS','LAVANDER 50 CM','LAVANDER','0',''],
  ['CORTOS','PEACH 50 CM','PEACH','0',''],
  ['CORTOS','PINK 50CM','PINK','0',''],
  ['CORTOS','PURPURA 50CM','PURPLE','0',''],
  ['CORTOS','WHITE 50CM','WHITE','0',''],
  ['CORTOS','YELLOW 50CM','YELLOW','0',''],
  // DELPHINIUM
  ['DELPHINIUM','DEEP BLUE JAY','DEEP BLUE JAY','001688','Delphinium Deep Blue Jay'],
  // DIANTHUS
  ['DIANTHUS','2021 MSB 2','WHITE','0',''],
  ['DIANTHUS','2022 MSR 3','RED','0',''],
  ['DIANTHUS','BARBERATUS FRESH','GREEN','0',''],
  ['DIANTHUS','MELLOW COOL','GREEN','0',''],
  ['DIANTHUS','TREGREEN','GREEN','0',''],
  // DIANTHUS BARBATUS
  ['DIANTHUS BARBATUS','POETHUS BURGUNDY','BURGUNDY','0',''],
  ['DIANTHUS BARBATUS','POETHUS DARK PINK','DARK PINK','0',''],
  ['DIANTHUS BARBATUS','POETHUS LAVENDER','LAVENDER','0',''],
  ['DIANTHUS BARBATUS','POETHUS RED','RED','0',''],
  ['DIANTHUS BARBATUS','POETHUS WHITE','WHITE','0',''],
  // DIANTHUS CARYOPHYLUS
  ['DIANTHUS CARYOPHYLUS','21P0949 PINK CHERRY','PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','21P0950 BIC PINK WHITE','LIGHT PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','22P0610 ORANGE','ORANGE','0',''],
  ['DIANTHUS CARYOPHYLUS','22P1100 CHERRY','HOT PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','22P1106 PEACH','PEACH','0',''],
  ['DIANTHUS CARYOPHYLUS','2P0648 RED','RED','0',''],
  ['DIANTHUS CARYOPHYLUS','FIORINO ACUARELA','PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','FIORINO ESTILO','HOT PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','FIORINO FOLIE','HOT PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','FIORINO IRIS','LIGHT PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','LILLIPUT FOREVER','HOT PINK','0',''],
  ['DIANTHUS CARYOPHYLUS','LILLIPUT LAVENDER','LAVENDER','0',''],
  ['DIANTHUS CARYOPHYLUS','LILLIPUT NUAGE','WHITE','0',''],
  ['DIANTHUS CARYOPHYLUS','LILLIPUT ROUGE','RED','0',''],
  // ECHINACEA
  ['ECHINACEA','BUBBLE GUM','BUBBLE GUM','0',''],
  ['ECHINACEA','CAT EYE','CAT EYE','0',''],
  ['ECHINACEA','SPIKY','SPIKY','0',''],
  // EUCALYPTUS
  ['EUCALYPTUS','BABY BLUE','BABY BLUE','002409','Eucalipto Baby blue'],
  ['EUCALYPTUS','FRANCE BLUE','FRANCE BLUE','002722','Eucalipto France Blue'],
  ['EUCALYPTUS','GREENBACK','GREENBACK','002748','Eucalipto Green Back'],
  ['EUCALYPTUS','NICHOLLI','NICHOLLI','002654','Eucalipto Nicholii'],
  ['EUCALYPTUS','PARVIFOLIA GLOBE','PARVIFOLIA GLOBE','002736','Eucalipto Parvifolia Globe'],
  ['EUCALYPTUS','PARVIFOLIA SMALL LEAF','PARVIFOLIA SMALL LEAF','002653','Eucalipto Parvifolia Smal Leaf'],
  ['EUCALYPTUS','PARVULA','PARVULA','002734','Eucalipto Parvula'],
  ['EUCALYPTUS','PARVULA BIG LEAF','PARVULA BIG LEAF','002735','Eucalipto Parvula Big Leaf'],
  ['EUCALYPTUS','SILVER DOLLAR','SILVER DOLLAR','002655','Eucalipto Silver Dolar'],
  ['EUCALYPTUS','STUARTIANA','STUARTIANA','002733','Eucalipto Stuartiana'],
  // FLORINCA
  ['FLORINCA','JADE','GREEN','0',''],
  ['FLORINCA','HOT PINK','HOT PINK','002705','Florinca Hot Pink'],
  ['FLORINCA','PINK','PINK','002704','Florinca Pink'],
  ['FLORINCA','PURPLE','PURPLE','002703','Florinca Purple'],
  ['FLORINCA','RED','RED','002344','Florinca Red'],
  ['FLORINCA','WHITE','WHITE','002346','Florinca White'],
  // FOLLAJES
  ['FOLLAJES','LIGUSTRUM','LIGUSTRUM','002502','LIGUSTRUM'],
  ['FOLLAJES','COPROSMAS BROWN','COPROSMAS BROWN','0',''],
  ['FOLLAJES','COPROSMAS BROWN','COPROSMAS NIGHT','002732','Coprosmas Brown'],
  ['FOLLAJES','COPROSMAS GREEN','COPROSMAS GREEN','0',''],
  ['FOLLAJES','COPROSMAS GREEN','COPROSMAS SUNSET','002731','Coprosmas Green'],
  ['FOLLAJES','COPROSMAS RED','COPROSMAS DAWN','002732','Coprosmas Red'],
  ['FOLLAJES','COPROSMAS RED','COPROSMAS RED','0',''],
  ['FOLLAJES','COTINUS','COTINUS','002729','Cotinus'],
  ['FOLLAJES','PHOTINIA','PHOTINIA','002730','Photinia'],
  ['FOLLAJES','SPIRAEA','SPIRAEA','002728','Spirea'],
  ['FOLLAJES','CIPRES','CIPRES','002460','Cipres'],
  ['FOLLAJES','GREEN  PLANET 60 CM','GREEN','0',''],
  ['FOLLAJES','GREEN  PLANET 60 CM','GREEN PLANET','002643','Green Planet'],
  ['FOLLAJES','GREEN  PLANET 70 CM','GREEN','0',''],
  ['FOLLAJES','GREEN  PLANET 70 CM','GREEN PLANET','002643','Green Planet'],
  ['FOLLAJES','HEVES','HEVES','002414','HEVES'],
  // HELLEBORUS
  ['HELLEBORUS','DOUBLE ELLEN PICOTEE','DOUBLE ELLEN PICOTEE','002850','Helleborus'],
  ['HELLEBORUS','DOUBLE ELLEN PINK','DOUBLE ELLEN PINK','002848','Helleborus'],
  ['HELLEBORUS','DOUBLE ELLEN RED','DOUBLE ELLEN RED','002853','Helleborus'],
  ['HELLEBORUS','DOUBLE ELLEN WHITE','DOUBLE ELLEN WHITE','002849','Helleborus'],
  ['HELLEBORUS','PRETTY ELLEN PINK','PRETTY ELLEN PINK','002851','Helleborus'],
  ['HELLEBORUS','PRETTY ELLEN RED','PRETTY ELLEN RED','002852','Helleborus'],
  ['HELLEBORUS','PRETTY ELLEN WHITE','PRETTY ELLEN WHITE','002854','Helleborus'],
  // LIMONIUM
  ['LIMONIUM','ARIZONA','ARIZONA','002228','Limonium Arizona'],
  ['LIMONIUM','CALIFORNIA','CALIFORNIA','001722','Limonium California'],
  ['LIMONIUM','CARNIVAL KANSAS','CARNIVAL KANSAS','002646','Limoniun Carnival Kansas'],
  ['LIMONIUM','KANSAS','KANSAS','001088','Limonium Kansas'],
  ['LIMONIUM','OSHI PINK','OSHI PINK','003001','Oshi pink'],
  ['LIMONIUM','P110','P110','002715','Limoniun P110'],
  ['LIMONIUM','PINK','PINK','002716','Limonium pink'],
  ['LIMONIUM','SILVER  PINK','SILVER  PINK','0',''],
  ['LIMONIUM','SKY LIGHT','SKY LIGHT','0',''],
  ['LIMONIUM','SPLENDID BLUE','SPLENDID BLUE','002464','Splendid blue'],
  ['LIMONIUM','UTHA','UTHA','002714','Limoniun Utha'],
  // PARAMO
  ['PARAMO','BLACK','BLACK','001009','Delphinium Elatum Black Velvet LOMA'],
  ['PARAMO','MANUELA','MANUELA','002249','Delphinium Elatum Manuela'],
  ['PARAMO','PRINCESS','PRINCESS','0',''],
  ['PARAMO','AZUL','AZUL','001007','Delphinium Elatum Blue River LOMA'],
  ['PARAMO','BLANCO','WHITE','001006','Delphinium Elatum White'],
  ['PARAMO','CELESTE','CELESTE','001008','Delphinium Elatum Sky Blue LOMA'],
  ['PARAMO','FULL MOON','FULL MOON','002248','Delphinium Elatum FullMoon Riv'],
  ['PARAMO','ROSA','ROSA','001010','Delphinium Elatum Pink River'],
  ['PARAMO','WHITE SPRITE','WHITE','0',''],
  ['PARAMO','AZUL','BLUE PARAMO','001007','Delphinium Elatum Blue River LOMA'],
  ['PARAMO','BLACK','BLACK PARAMO','001009','Delphinium Elatum Black Velvet LOMA'],
  ['PARAMO','CELESTE','CELESTE PARAMO','001008','Delphinium Elatum Sky Blue LOMA'],
  ['PARAMO','HISAO','BLUE','0',''],
  // SOLIDAGO PICCOLINO
  ['SOLIDAGO PICCOLINO','AMBAR','AMBAR','002830','Solidago Piccolino Ambar'],
  ['SOLIDAGO PICCOLINO','HELIO','HELIO','002803','Piccolino Helio'],
  // SOLIDAGO SC
  ['SOLIDAGO SC','GOLD','GOLD','001708','Solidago Gold'],
  ['SOLIDAGO SC','GOLDEN GLORY','GOLDEN GLORY','0',''],
  ['SOLIDAGO SC','TARAMBA','TARAMBA','002500','Taramba'],
  // STATICE
  ['STATICE','APRICOT','APRICOT','002695','Statice TC Apricot'],
  ['STATICE','BLUE','BLUE','002140','Statice TC Blue Levis'],
  ['STATICE','CARNIVAL APRICOT','CARNIVAL APRICOT','0',''],
  ['STATICE','CARNIVAL  BLUE','CARNIVAL  BLUE','0',''],
  ['STATICE','CARNIVAL   CREMA','CARNIVAL   CREMA','0',''],
  ['STATICE','CARNIVAL HOT PINK','CARNIVAL HOT PINK','0',''],
  ['STATICE','CARNIVAL LAVANDER','CARNIVAL LAVANDER','0',''],
  ['STATICE','CARNIVAL PEACH','CARNIVAL PEACH','0',''],
  ['STATICE','CARNIVAL  PRETTY','CARNIVAL  PRETTY','0',''],
  ['STATICE','CARNIVAL PURPURA','CARNIVAL PURPURA','0',''],
  ['STATICE','CARNIVAL SILKY','CARNIVAL SILKY','0',''],
  ['STATICE','CARNIVAL WHITE','CARNIVAL WHITE','0',''],
  ['STATICE','CARNIVAL   YELLOW','CARNIVAL   YELLOW','0',''],
  ['STATICE','CREMA','CREMA','0',''],
  ['STATICE','HOT PINK','HOT PINK','001772','Statice TC Sweet Wings'],
  ['STATICE','LAVENDER','LAVENDER','001069','Statice TC Lavender Ocean Wing'],
  ['STATICE','PEACH','PEACH','002106','Statice TC Peach'],
  ['STATICE','PRETTY','PINK','001068','Statice TC Pink Pretty Wings'],
  ['STATICE','PURPURA','PURPLE','001221','Statice TC Pur Mystic BlueBird'],
  ['STATICE','SILKY','SILKY','0',''],
  ['STATICE','WHITE','WHITE','001066','Statice TC White Starlight Win'],
  ['STATICE','YELLOW','YELLOW','001064','Statice TC Yellow Starlight W'],
  ['STATICE','AVA WHITE','WHITE','001066','Statice TC White Starlight Win'],
  ['STATICE','COLOURFUL ORANGE','ORANGE','0',''],
  ['STATICE','ISA WHITE','WHITE','001066','Statice TC White Starlight Win'],
  ['STATICE','LAPIS','PURPLE','001221','Statice TC Pur Mystic BlueBird'],
  ['STATICE','LUCIA APRICOT','PEACH','002106','Statice TC Peach'],
  ['STATICE','MARINA VIOLET','PURPLE','001221','Statice TC Pur Mystic BlueBird'],
  ['STATICE','MEADOW WHITE GELLATO','WHITE','001066','Statice TC White Starlight Win'],
  ['STATICE','NAVY','PURPLE','001221','Statice TC Pur Mystic BlueBird'],
  ['STATICE','SN17P3','PINK','001068','Statice TC Pink Pretty Wings'],
  ['STATICE','SN18L2','LAVENDER','001069','Statice TC Lavender Ocean Wing'],
  ['STATICE','SN20J5','YELLOW','001064','Statice TC Yellow Starlight W'],
  ['STATICE','SN20O2','APRICOT','002695','Statice TC Apricot'],
  ['STATICE','TESSA MALVA','LAVENDER','001069','Statice TC Lavender Ocean Wing'],
  // ZANTEDESCHIA
  ['ZANTEDESCHIA','ARABIAN NIGHT','BLACK','002921','Arabian Night'],
  ['ZANTEDESCHIA','BLOODY MARY','ORANGE','002925','Bloody Mary'],
  ['ZANTEDESCHIA','CANTOR','BLACK','002921','Arabian Night'],
  ['ZANTEDESCHIA','CAPTIAN VENTURA','WHITE','002927','white'],
  ['ZANTEDESCHIA','COPACABANA','YELLOW','002923','Montecarlo'],
  ['ZANTEDESCHIA','DREAMLAND','LIGHT PINK','002920','Fantasia'],
  ['ZANTEDESCHIA','DREAMLAND','PINK','0',''],
  ['ZANTEDESCHIA','DURBAN','PURPLE','002922','Purple Spirit'],
  ['ZANTEDESCHIA','FANTASIA','PINK','0',''],
  ['ZANTEDESCHIA','GOLDEN MEDAL','YELLOW','002923','Montecarlo'],
  ['ZANTEDESCHIA','IVORY ART','WHITE','002927','white'],
  ['ZANTEDESCHIA','LADY MARMALADE','ORANGE','002925','Bloody Mary'],
  ['ZANTEDESCHIA','MONTECARLO','YELLOW','002923','Montecarlo'],
  ['ZANTEDESCHIA','PURPLE SPIRIT','PURPLE','002922','Purple Spirit'],
  ['ZANTEDESCHIA','ROYAL DUTCH','ORANGE','002925','Bloody Mary'],
  ['ZANTEDESCHIA','SUMATRA','LAVENDER','002924','Sumatra'],
  ['ZANTEDESCHIA','SUN CLUB','YELLOW','002923','Montecarlo'],
  ['ZANTEDESCHIA','TOKYO','RED','002926','Tokio'],
  ['ZANTEDESCHIA','WHITE FLIRT','WHITE','002927','white'],
  ['ZANTEDESCHIA','WHITE HORSE','WHITE','002927','white'],
  ['ZANTEDESCHIA','WHITE RUMBA','WHITE','002927','white'],
  ['ZANTEDESCHIA','ZAZU','PINK','0',''],
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function norm(s) { return s?.trim().toUpperCase() ?? ''; }

async function req(method, path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Main ─────────────────────────────────────────────────────────────────────
const [,, email, password] = process.argv;
if (!email || !password) {
  console.error('Uso: node assign-codigos-produccion.mjs <email> <password>');
  process.exit(1);
}

console.log('🔐 Autenticando...');
const { accessToken: token } = await req('POST', '/auth/login', { email, password });
console.log('✅ Token obtenido\n');

// Obtener todas las fincas
const fincas = await req('GET', '/fincas', null, token);
console.log(`📦 Fincas encontradas: ${fincas.length}`);

// Construir mapa completo: producto.nombre → variedad.nombre → color.nombre → colorId
const colorMap = new Map(); // key: `${producto}||${variedad}||${color}` → colorId

for (const finca of fincas) {
  const productos = await req('GET', `/productos?fincaId=${finca.id}`, null, token);
  for (const producto of productos) {
    const variedades = await req('GET', `/variedades?productoId=${producto.id}`, null, token);
    for (const variedad of variedades) {
      const colores = await req('GET', `/colores?variedadId=${variedad.id}`, null, token);
      for (const color of colores) {
        const key = `${norm(producto.nombre)}||${norm(variedad.nombre)}||${norm(color.nombre)}`;
        colorMap.set(key, color.id);
      }
    }
  }
}

console.log(`🎨 Total colores indexados: ${colorMap.size}\n`);

// Aplicar asignaciones
let updated = 0;
let skipped = 0;
let notFound = 0;
const notFoundList = [];

for (const [prod, vari, col, codigoRaw, nombreOriginalRaw] of ASIGNACIONES) {
  const key = `${norm(prod)}||${norm(vari)}||${norm(col)}`;
  const colorId = colorMap.get(key);

  if (!colorId) {
    notFound++;
    notFoundList.push(`  ✗ ${prod} / ${vari} / ${col}`);
    continue;
  }

  const codigo = codigoRaw === '0' ? null : codigoRaw.trim() || null;
  const nombreOriginal = nombreOriginalRaw?.trim() || null;

  if (!codigo && !nombreOriginal) {
    skipped++;
    continue;
  }

  try {
    await req('PATCH', `/colores/${colorId}`, { codigo, nombreOriginal }, token);
    console.log(`  ✓ ${prod} / ${vari} / ${col} → ${codigo ?? '—'} | ${nombreOriginal ?? '—'}`);
    updated++;
  } catch (e) {
    console.error(`  ✗ Error actualizando ${key}:`, e.message);
  }
}

console.log(`
════════════════════════════════════════
✅ Actualizados : ${updated}
⏭  Sin datos    : ${skipped} (código 0 y sin nombre)
❌ No encontrados: ${notFound}
════════════════════════════════════════`);

if (notFoundList.length) {
  console.log('\nColores no encontrados en producción:');
  notFoundList.forEach(l => console.log(l));
}
