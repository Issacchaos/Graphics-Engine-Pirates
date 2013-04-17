#!/usr/bin/env python
import sys
import os,stat 
v=sys.hexversion >> 24
if v == 2:
    assert 0
    import BaseHTTPServer,SimpleHTTPServer
    server = BaseHTTPServer.HTTPServer( ('127.0.0.1',8080), 
        SimpleHTTPServer.SimpleHTTPRequestHandler)
else:
    import http.server 
    server = http.server.HTTPServer( ('127.0.0.1',8080), 
        http.server.SimpleHTTPRequestHandler)
while 1:
    server.handle_request()



