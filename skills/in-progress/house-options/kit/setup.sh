#!/bin/sh
# setup.sh: check what house-options needs on this Mac. Installs the missing parts only with --install.
#
#   sh setup.sh [--install] [--node "<command>"] [folder]
#
#   folder     where the runs live (default ~/house-options). Playwright goes there, so every run folder
#              inside it finds it.
#   --node     the command that runs node, when plain node does not work here (for example "orb run node"
#              for a Linux VM). Default: "node" in the folder's brief.json if there is one, otherwise node.
#   --install  install Playwright and its Chromium into the folder, and node with Homebrew if Homebrew is
#              here. The skill asks the person first.
#
# Checks node 18 or later, npm and npx, Playwright in the folder, and that Playwright's Chromium starts.
# Exit 0 when everything is ready, 1 when something is missing, 2 when this Mac blocks node.
set -u

usage() { sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; }

install=0; node_cmd=""; dir=""
while [ $# -gt 0 ]; do
  case "$1" in
    --install) install=1 ;;
    --node) [ $# -ge 2 ] || { echo "setup.sh: --node needs a command" >&2; exit 1; }; node_cmd=$2; shift ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "setup.sh: unknown option $1" >&2; usage >&2; exit 1 ;;
    *) dir=$1 ;;
  esac
  shift
done
[ -n "$dir" ] || dir="$HOME/house-options"
if [ -z "$node_cmd" ] && [ -f "$dir/brief.json" ]; then
  node_cmd=$(sed -n 's/.*"node"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$dir/brief.json" | head -n 1)
fi
[ -n "$node_cmd" ] || node_cmd=node
# npm and npx sit beside node, or behind the same wrapper ("orb run node" -> "orb run npx")
case "$node_cmd" in
  *node) npm_cmd="${node_cmd%node}npm"; npx_cmd="${node_cmd%node}npx" ;;
  *) npm_cmd=npm; npx_cmd=npx ;;
esac

ok()   { printf 'ok       %s\n' "$1"; }
miss() { printf 'MISSING  %s\n' "$1"; }

# --- node: present, allowed to run, 18 or later -------------------------------------------------------
check_node() {
  out=$($node_cmd -v 2>&1); rc=$?
  if [ $rc -eq 127 ]; then node_state=missing; return; fi
  if [ $rc -ne 0 ]; then node_state=blocked; why="exit $rc"; return; fi
  major=$(printf '%s\n' "$out" | sed -n 's/^v\([0-9][0-9]*\)\..*/\1/p' | head -n 1)
  if [ -z "$major" ]; then node_state=blocked; why="it printed no version"; return; fi
  if [ "$major" -lt 18 ]; then node_state=old; return; fi
  node_state=ok; node_version=$out
}

check_node
if [ "$node_state" = missing ] && [ $install -eq 1 ] && [ "$node_cmd" = node ] && command -v brew >/dev/null 2>&1; then
  echo "Installing node with Homebrew: brew install node"
  brew install node && check_node
fi
case "$node_state" in
  missing|old)
    if [ "$node_state" = missing ]; then miss "node (Node.js 18 or later): not found as \"$node_cmd\""
    else miss "node 18 or later: \"$node_cmd\" is $out"; fi
    echo
    echo "To fix, install Node.js LTS. The easiest way: download the macOS installer from"
    echo "https://nodejs.org/en/download, open it and follow its steps. Or, with Homebrew:"
    echo "  brew install node"
    echo "Then run this check again."
    exit 1 ;;
  blocked)
    printf 'BLOCKED  node: "%s" was stopped (%s)\n' "$node_cmd" "$why"
    echo
    echo "Some managed Macs stop programs that are not signed by an approved developer, and node is one."
    echo "Ask whoever manages this Mac to allow Node.js, or run node another way, for example inside a"
    echo "Linux VM. Then give that command to this check and to the skill:"
    echo "  sh setup.sh --node \"orb run node\" \"$dir\"     (an OrbStack VM, for example)"
    echo "and set \"node\" in brief.json to the same command."
    exit 2 ;;
esac
ok "node $node_version (run as \"$node_cmd\")"

# --- npm, npx, Playwright and Chromium ----------------------------------------------------------------
platform=$($node_cmd -p process.platform 2>/dev/null)
with_deps=""; [ "$platform" = linux ] && with_deps="--with-deps "

check_rest() {
  need_npm=0; need_pw=0; need_chromium=0; launch_err=""
  $npx_cmd --version >/dev/null 2>&1 && $npm_cmd --version >/dev/null 2>&1 || need_npm=1
  if [ $need_npm -eq 0 ] && [ -d "$dir" ] \
     && (cd "$dir" && $npx_cmd --no playwright --version >/dev/null 2>&1) \
     && (cd "$dir" && $node_cmd -e "require.resolve('playwright')" >/dev/null 2>&1); then :; else need_pw=1; fi
  [ $need_pw -eq 0 ] || return 0
  if ! (cd "$dir" && $node_cmd -e "process.exit(require('fs').existsSync(require('playwright').chromium.executablePath()) ? 0 : 1)" >/dev/null 2>&1); then
    need_chromium=1; return 0
  fi
  launch_err=$(cd "$dir" && $node_cmd -e "
    const t = setTimeout(() => { console.log('Chromium did not start within 60 s'); process.exit(3); }, 60000);
    require('playwright').chromium.launch().then(b => b.close()).then(() => clearTimeout(t),
      e => { console.log(String(e.message).split('\n')[0]); process.exit(1); });" 2>&1) || need_chromium=2
}

pw_install="mkdir -p \"$dir\" && cd \"$dir\" && $npm_cmd install --no-audit --no-fund playwright"
cr_install="cd \"$dir\" && $npx_cmd playwright install ${with_deps}chromium"

check_rest
if [ $install -eq 1 ] && [ $need_npm -eq 0 ] && { [ $need_pw -eq 1 ] || [ $need_chromium -eq 1 ]; }; then
  if [ $need_pw -eq 1 ]; then echo "Installing Playwright into $dir"; sh -c "$pw_install" || exit 1; fi
  echo "Installing Playwright's Chromium (a download of a few hundred MB)"
  sh -c "$cr_install" || exit 1
  check_rest
fi

missing=0
if [ $need_npm -eq 1 ]; then
  missing=1; miss "npm and npx, which come with Node.js"
  echo "  To fix, install Node.js again from https://nodejs.org/en/download (npm and npx come with it)."
else
  ok "npm and npx"
fi
if [ $need_npm -eq 0 ]; then
  if [ $need_pw -eq 1 ]; then
    missing=1; miss "Playwright in $dir"
    echo "  To fix, run:"
    echo "    $pw_install"
    echo "    $cr_install"
  else
    ok "Playwright in $dir"
    if [ $need_chromium -eq 1 ]; then
      missing=1; miss "Playwright's Chromium"
      echo "  To fix, run:"
      echo "    $cr_install"
    elif [ $need_chromium -eq 2 ]; then
      missing=1; miss "a working Chromium: it is installed but did not start: $launch_err"
      echo "  If the message says \"operation not permitted\" and you ran this inside Claude Code's sandbox,"
      echo "  run it outside the sandbox. If this Mac blocks unsigned programs, use the same fix as for node:"
      echo "  run node in a VM and pass --node. Reinstalling may also help:"
      echo "    $cr_install"
    else
      ok "Playwright's Chromium starts"
    fi
  fi
fi

if [ $missing -eq 1 ]; then
  [ $install -eq 1 ] || { echo; echo "Or run this check with --install to install what is missing."; }
  exit 1
fi
echo "Ready."
exit 0
