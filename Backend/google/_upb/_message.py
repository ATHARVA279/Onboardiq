"""Stub module to force ImportError when importing google._upb._message.

This prevents the protobuf autodetection from attempting to import the
compiled upb extension (which can raise TypeError on newer Python
versions), allowing the runtime to choose the pure-Python implementation.
"""
raise ImportError("local stub: block google._upb._message import to avoid incompatible C-extension")
