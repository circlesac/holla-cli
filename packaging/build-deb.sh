#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 4 ]; then
  printf "usage: %s BINARY VERSION ARCH OUTPUT_DIR\n" "$0" >&2
  exit 2
fi

binary="$1"
version="$2"
arch="$3"
output_dir="$4"

case "$arch" in
  amd64|arm64) ;;
  *)
    printf "unsupported Debian architecture: %s\n" "$arch" >&2
    exit 1
    ;;
esac

if [ ! -x "$binary" ]; then
  printf "binary is not executable: %s\n" "$binary" >&2
  exit 1
fi

command -v dpkg-deb >/dev/null 2>&1 || {
  printf "dpkg-deb is required\n" >&2
  exit 1
}

package_root="$(mktemp -d "${TMPDIR:-/tmp}/holla-deb.XXXXXX")"
trap 'rm -rf "$package_root"' EXIT
chmod 0755 "$package_root"

install -d -m 0755 "$package_root/DEBIAN" "$package_root/usr/bin"
install -m 0755 "$binary" "$package_root/usr/bin/holla"

cat > "$package_root/DEBIAN/control" <<CONTROL
Package: holla
Version: $version
Section: utils
Priority: optional
Architecture: $arch
Maintainer: Circles <packages@circles.ac>
Homepage: https://github.com/circlesac/holla-cli
Description: Multi-provider messaging command-line client
CONTROL

install -d -m 0755 "$output_dir"
dpkg-deb --build --root-owner-group \
  "$package_root" \
  "$output_dir/holla_${version}_${arch}.deb"
