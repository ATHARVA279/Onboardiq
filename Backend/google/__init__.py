"""
Local stub package to prevent importing incompatible compiled
google._upb._message extension when running under unsupported
Python versions. This lets the protobuf autodetection fall through
to the pure-Python implementation.
"""

# Intentionally empty; presence of this package ensures local import
# resolution for google._upb._message can be controlled by the
# stub in google/_upb/_message.py
