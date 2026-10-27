CXX ?= g++
CPPFLAGS += -Ivendor $(shell pkg-config --cflags libcurl)
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -Wpedantic
LDLIBS += $(shell pkg-config --libs libcurl) -pthread

.PHONY: all run test clean
all: build/one-piece
build/one-piece: src/main.cpp vendor/json.hpp vendor/httplib.h
	mkdir -p build
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) src/main.cpp -o $@ $(LDLIBS)
run: all
	./build/one-piece
test: all
	python3 tests/smoke.py
clean:
	rm -f build/one-piece
