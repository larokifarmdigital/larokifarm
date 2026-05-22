#!/usr/bin/env bash
# Genera cn-por-sintoma.md llamando a CIMA (AEMPS) por cada síntoma.
# Estrategia: por cada principio activo del síntoma →
#   GET /medicamentos?nombre=<activo>&receta=0&comerc=1&pagesize=25
#   para cada nregistro → GET /presentaciones?nregistro=<n>
#   y se filtran CNs con comerc=true y receta=false.
set -euo pipefail

BASE='https://cima.aemps.es/cima/rest'
OUT="$(dirname "$0")/../cn-por-sintoma.md"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Mapeo síntoma → activos (uno por línea, "<id>|<label>|<activo1>,<activo2>,...")
SYMPTOMS=(
"congestion|CONGESTIÓN NASAL|oximetazolina,xilometazolina,fenilefrina"
"gripal|SÍNDROME GRIPAL|paracetamol,ibuprofeno,pseudoefedrina"
"tos|TOS|dextrometorfano,ambroxol,cloperastina,guaifenesina,dropropizina"
"picaduras|PICADURAS|dimetindeno,hidrocortisona,amoniaco"
"quemaduras|QUEMADURAS|trolamina,centella,sulfadiazina"
"urticaria|URTICARIA|loratadina,cetirizina,ebastina,bilastina,dexclorfeniramina"
"acne|ACNÉ|peroxido de benzoilo,acido salicilico"
"aftas|AFTAS|clorhexidina,benzocaina,acido hialuronico"
"heridas|HERIDAS CUTÁNEAS|clorhexidina,povidona,centella"
"herpes|HERPES LABIAL|aciclovir"
"eczema|LESIONES ECZEMATOSAS|hidrocortisona,clobetasona"
"acidez|ACIDEZ|omeprazol,almagato,famotidina,ranitidina,bicarbonato"
"diarrea|DIARREA AGUDA|loperamida,racecadotrilo"
"estrenimiento|ESTREÑIMIENTO|lactulosa,macrogol,bisacodilo,plantago"
"vomitos|VÓMITOS|dimenhidrinato,doxilamina"
"cefalea|CEFALEA|paracetamol,ibuprofeno,acido acetilsalicilico,naproxeno"
"dental|DOLOR DENTARIO|paracetamol,ibuprofeno,benzocaina,lidocaina"
"espalda|DOLOR DE ESPALDA|ibuprofeno,diclofenaco,naproxeno,paracetamol"
"catarral|SÍNDROME CATARRAL|paracetamol,ibuprofeno,dextrometorfano,fenilefrina"
"garganta|DOLOR DE GARGANTA|benzocaina,lidocaina,clorhexidina,bencidamina,flurbiprofeno"
"menstrual|DOLOR MENSTRUAL|ibuprofeno,naproxeno,paracetamol"
"hemorroides|HEMORROIDES|lidocaina,policresuleno,hidrocortisona"
"conjuntivitis|CONJUNTIVITIS|nafazolina,tetrahidrozolina,antazolina"
"vaginitis|VAGINITIS|clotrimazol,miconazol"
"varices|VARICES EN EXTREMIDADES INFERIORES|diosmina,escina,heparina"
"insomnio|INSOMNIO|doxilamina,difenhidramina,valeriana"
)

urlenc() { jq -rn --arg v "$1" '$v|@uri'; }

# 1) Obtener nregistros únicos por activo
collect_nregs_for_activo() {
  local activo="$1"
  local enc; enc="$(urlenc "$activo")"
  curl -fsS "${BASE}/medicamentos?nombre=${enc}&receta=0&comerc=1&pagesize=25" \
    | jq -r '.resultados[]?.nregistro' 2>/dev/null || true
}

# 2) Obtener CNs OTC y comercializados de un nregistro
collect_cns_for_nregistro() {
  local n="$1"
  curl -fsS "${BASE}/presentaciones?nregistro=${n}" \
    | jq -r '.resultados[]? | select(.comerc==true and .receta==false) | "\(.cn)\t\(.nombre)"' 2>/dev/null || true
}
export -f collect_cns_for_nregistro
export BASE

echo "→ Recogiendo datos de CIMA…"

declare -a ROWS_FILES=()
for entry in "${SYMPTOMS[@]}"; do
  IFS='|' read -r sid label activos_csv <<<"$entry"
  echo "  • ${label}"
  : > "${TMP}/${sid}.nregs"
  IFS=',' read -r -a activos <<<"$activos_csv"
  for activo in "${activos[@]}"; do
    collect_nregs_for_activo "$activo" >> "${TMP}/${sid}.nregs"
  done
  sort -u "${TMP}/${sid}.nregs" -o "${TMP}/${sid}.nregs"
  # En paralelo: presentaciones por nregistro → CNs
  if [[ -s "${TMP}/${sid}.nregs" ]]; then
    xargs -P 12 -n 1 -I{} bash -c 'collect_cns_for_nregistro "$@"' _ {} \
      < "${TMP}/${sid}.nregs" \
      | sort -u -k1,1 \
      > "${TMP}/${sid}.cns"
  else
    : > "${TMP}/${sid}.cns"
  fi
done

# 3) Generar el .md
{
  echo "# Códigos Nacionales (CN) por síntoma — sin receta"
  echo
  echo "> Generado el $(date '+%Y-%m-%d %H:%M') consultando la API pública de **CIMA (AEMPS)**."
  echo "> Filtro aplicado en todas las consultas: \`receta=0\` (sin receta) y \`comerc=1\` (comercializado). No se aplican filtros de edad."
  echo
  echo "## API utilizada"
  echo
  echo "- **Base URL**: \`https://cima.aemps.es/cima/rest\`"
  echo "- **Endpoint 1 (búsqueda)**: \`GET /medicamentos?nombre=<principio_activo>&receta=0&comerc=1&pagesize=25\`"
  echo "- **Endpoint 2 (códigos nacionales)**: \`GET /presentaciones?nregistro=<nregistro>\`"
  echo "  - Se filtra cada presentación a \`comerc==true && receta==false\`."
  echo
  echo "Para cada síntoma se mapean varios principios activos (basado en \`src/lib/symptoms.ts\` y guías de medicación sin receta). Para cada activo se pide la búsqueda por nombre, se recogen los \`nregistro\` y luego sus presentaciones (CN)."
  echo
  echo "## Mapeo síntoma → principios activos consultados"
  echo
  echo "| Síntoma | Principios activos consultados |"
  echo "|---|---|"
  for entry in "${SYMPTOMS[@]}"; do
    IFS='|' read -r sid label activos_csv <<<"$entry"
    echo "| ${label} | ${activos_csv} |"
  done
  echo
  echo "## Resultados — Códigos Nacionales (CN)"
  echo
  for entry in "${SYMPTOMS[@]}"; do
    IFS='|' read -r sid label activos_csv <<<"$entry"
    count=$(wc -l < "${TMP}/${sid}.cns" | tr -d ' ')
    echo "### ${label}"
    echo
    echo "Activos consultados: \`${activos_csv}\` · **CN encontrados: ${count}**"
    echo
    if [[ "$count" == "0" ]]; then
      echo "_Sin resultados sin receta para los activos consultados._"
      echo
      continue
    fi
    echo "<details><summary>Ver ${count} CN</summary>"
    echo
    echo "| CN | Presentación |"
    echo "|---|---|"
    while IFS=$'\t' read -r cn nombre; do
      # Escapar pipes
      nombre_esc="${nombre//|/\\|}"
      echo "| ${cn} | ${nombre_esc} |"
    done < "${TMP}/${sid}.cns"
    echo
    echo "</details>"
    echo
    echo "**Solo CN (lista plana):**"
    echo
    echo '```'
    cut -f1 "${TMP}/${sid}.cns" | paste -sd, -
    echo '```'
    echo
  done
  echo "## Reproducir las llamadas (curl)"
  echo
  echo '```bash'
  echo '# Ejemplo: paracetamol sin receta + sus CN'
  echo 'curl -s "https://cima.aemps.es/cima/rest/medicamentos?nombre=paracetamol&receta=0&comerc=1&pagesize=25" \'
  echo '  | jq -r ".resultados[].nregistro" \'
  echo '  | xargs -I{} curl -s "https://cima.aemps.es/cima/rest/presentaciones?nregistro={}" \'
  echo '  | jq -r ".resultados[] | select(.comerc==true and .receta==false) | .cn"'
  echo '```'
  echo
  echo "---"
  echo
  echo "_Fuente: CIMA (AEMPS) — <https://cima.aemps.es/cima/dochtml/api/restapi.html>. Esta lista refleja lo devuelto por la API en el momento de la consulta y no sustituye al consejo farmacéutico._"
} > "$OUT"

echo "✓ Generado: $OUT"
echo "  Total síntomas: ${#SYMPTOMS[@]}"
