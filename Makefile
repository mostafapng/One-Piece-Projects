CXX ?= g++
CXXFLAGS ?= -std=c++17 -O2 -Wall -Wextra -Wpedantic
PKG_CONFIG ?= pkg-config
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
# Prefer Apple's compiler and an SDK matching the installed macOS major version.
# A newer installed SDK can otherwise be incompatible with the active linker.
ifeq ($(origin CXX),default)
CXX := $(shell xcrun --find clang++)
endif
MACOS_MAJOR := $(shell sw_vers -productVersion | cut -d. -f1)
SDKROOT ?= $(firstword $(wildcard /Library/Developer/CommandLineTools/SDKs/MacOSX$(MACOS_MAJOR).sdk) $(shell xcrun --sdk macosx --show-sdk-path))
export SDKROOT
CPPFLAGS += -isysroot $(SDKROOT)
CURL_PREFIX := $(shell brew --prefix curl 2>/dev/null)
ifneq ($(CURL_PREFIX),)
PKG_CONFIG := PKG_CONFIG_PATH="$(CURL_PREFIX)/lib/pkgconfig:$(PKG_CONFIG_PATH)" pkg-config
endif
endif
CPPFLAGS += -Ivendor $(shell $(PKG_CONFIG) --cflags libcurl)
LDLIBS += $(shell $(PKG_CONFIG) --libs libcurl) -pthread

.PHONY: all run test clean
all: build/one-piece
build/one-piece: src/main.cpp vendor/json.hpp vendor/httplib.h
	mkdir -p build
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) src/main.cpp -o $@ $(LDFLAGS) $(LDLIBS)
run: all
	./build/one-piece
test: all
	python3 tests/smoke.py
clean:
	rm -f build/one-piece
