"""
Local stub package to prevent importing incompatible compiled
google._upb._message extension when running under unsupported
Python versions. This lets the protobuf autodetection fall through
to the pure-Python implementation.
"""

from pkgutil import extend_path

# Extend the `google` namespace instead of replacing it outright so
# installed packages like `google.auth` remain importable while our
# local `_upb` shim is still available on the namespace path.
__path__ = extend_path(__path__, __name__)
