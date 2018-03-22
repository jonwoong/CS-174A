Jonathan Woong
804205763
DIS 1B
Assignment 3

I pass all tests except testIntersect and tcb.

Compilation steps (in Terminal):
	1. 'cd' to directory containing template-rt.cpp vecm.h matm.h
	2. c++ -g template-rt.cpp -o template-rt
	3. ./template-rt <TESTFILE.TXT>

I think my tracer fails for tcb because I need to displace by reflectance ray origin by reflectanceRay.direction*EPSILON, but when I do this and try to output a file, I reach seg fault. Not sure why.