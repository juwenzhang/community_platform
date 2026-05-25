#!/usr/bin/env python3
"""Colorize Nginx access logs for HuggingFace Container logs."""

import os
import re
import sys
import time

LOG_FILE = "/var/log/nginx/access.log"

RESET = "\033[0m"
DIM = "\033[90m"
BOLD = "\033[1m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
MAGENTA = "\033[35m"
BLUE = "\033[34m"

METHOD_COLORS = {
    "GET": CYAN,
    "POST": GREEN,
    "PUT": YELLOW,
    "PATCH": YELLOW,
    "DELETE": RED,
    "OPTIONS": MAGENTA,
}


def status_color(status: str) -> str:
    if status.startswith("2"):
        return GREEN
    if status.startswith("3"):
        return CYAN
    if status.startswith("4"):
        return YELLOW
    if status.startswith("5"):
        return RED
    return RESET


def extract(pattern: str, line: str, default: str = "-") -> str:
    match = re.search(pattern, line)
    return match.group(1) if match else default


def colorize(line: str) -> str:
    remote = extract(r"^(\S+)", line)
    request = re.search(r'"([A-Z]+)\s+([^\s]+)\s+HTTP/[^\"]+"', line)
    method = request.group(1) if request else "-"
    path = request.group(2) if request else "-"

    status = extract(r"status=(\d+)", line)
    request_time = extract(r"rt=([0-9.\-]+)", line)
    upstream = extract(r"upstream=([^\s]+)", line)
    upstream_status = extract(r"upstream_status=([^\s]+)", line)
    upstream_time = extract(r"upstream_rt=([^\s]+)", line)
    origin = extract(r'origin="([^"]*)"', line)

    method_color = METHOD_COLORS.get(method, BLUE)
    stat_color = status_color(status)

    return (
        f"{DIM}[nginx]{RESET} "
        f"{DIM}{remote}{RESET} "
        f"{method_color}{BOLD}{method:<7}{RESET} "
        f"{CYAN}{path}{RESET} "
        f"{stat_color}{BOLD}{status}{RESET} "
        f"{DIM}rt={request_time}s upstream={upstream}({upstream_status}/{upstream_time}s) "
        f"origin={origin}{RESET}"
    )


def main() -> None:
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    open(LOG_FILE, "a", encoding="utf-8").close()

    with open(LOG_FILE, "r", encoding="utf-8", errors="replace") as file:
        file.seek(0, os.SEEK_END)
        print(f"{DIM}[nginx-log]{RESET} watching {LOG_FILE}", flush=True)
        while True:
            line = file.readline()
            if not line:
                time.sleep(0.2)
                continue
            print(colorize(line.rstrip("\n")), flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(0)
