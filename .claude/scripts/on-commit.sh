#!/usr/bin/env bash
# Hook PostToolUse (Bash matcher) — se dispara después de cada Bash que
# ejecuto. Si el comando ejecutado incluye "git commit", actualiza la
# sección "## Cambios recientes" del CLAUDE.md más cercano al cwd con los
# últimos 5 commits. Silencioso si no aplica.
#
# El input JSON del hook llega por stdin (Claude Code lo pasa así).

set -euo pipefail

# Lee el input JSON del hook y extrae el comando ejecutado
INPUT=$(cat)
COMMAND=$(printf '%s' "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

# Solo actuar si el comando fue un git commit (excluyendo `git log`, `git commit --help`, etc.)
if ! printf '%s' "$COMMAND" | grep -Eq 'git[[:space:]]+commit([[:space:]]|$)'; then
  exit 0
fi

# Excluir intentos de amend a menos que el user lo quiera (no queremos duplicar entries)
if printf '%s' "$COMMAND" | grep -Eq -- '--amend'; then
  exit 0
fi

# Salir si estamos fuera de un git repo
if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel)
CWD=$(pwd)

# Busca el CLAUDE.md más cercano al cwd, subiendo hasta REPO_ROOT
find_nearest_claude_md() {
  local dir="$1"
  while [ "$dir" != "/" ] && [ "$dir" != "" ]; do
    if [ -f "$dir/CLAUDE.md" ]; then
      echo "$dir/CLAUDE.md"
      return 0
    fi
    # No subir más allá del root del repo
    if [ "$dir" = "$REPO_ROOT" ]; then
      return 1
    fi
    dir=$(dirname "$dir")
  done
  return 1
}

TARGET=$(find_nearest_claude_md "$CWD" || echo "")
if [ -z "$TARGET" ]; then
  # Si no hay CLAUDE.md cerca, no hacer nada
  exit 0
fi

# Obtener los últimos 5 commits (hash corto, fecha ISO corta, subject)
COMMITS=$(git log -n 5 --pretty=format:'- `%h` %ad — %s' --date=short 2>/dev/null || echo "")
if [ -z "$COMMITS" ]; then
  exit 0
fi

BLOCK_START="<!-- auto:recent-commits:start -->"
BLOCK_END="<!-- auto:recent-commits:end -->"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

NEW_BLOCK=$(cat <<EOF
$BLOCK_START
## Cambios recientes

Actualizado automáticamente al hacer commit ($TIMESTAMP).

$COMMITS
$BLOCK_END
EOF
)

# Reemplaza el bloque si ya existe, si no lo añade al final
if grep -q "$BLOCK_START" "$TARGET"; then
  # Reemplaza el bloque entre marcadores usando python (portable y seguro)
  python3 - "$TARGET" "$BLOCK_START" "$BLOCK_END" <<PYEOF
import re, sys, io
target, start, end = sys.argv[1], sys.argv[2], sys.argv[3]
with io.open(target, 'r', encoding='utf-8') as f:
    content = f.read()
new_block = """$NEW_BLOCK"""
pattern = re.compile(re.escape(start) + r'.*?' + re.escape(end), re.DOTALL)
content = pattern.sub(new_block, content)
with io.open(target, 'w', encoding='utf-8') as f:
    f.write(content)
PYEOF
else
  # Añade al final con salto de línea
  printf '\n%s\n' "$NEW_BLOCK" >> "$TARGET"
fi

# Mensaje al terminal para saber que actuó (opcional, no bloquea)
echo "✓ Actualizados últimos commits en $TARGET" >&2
exit 0
