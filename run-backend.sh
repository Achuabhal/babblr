#!/bin/bash

# Start backend server
cd "$(dirname "$0")/backend"
export PYTHONPATH="$(pwd)"
cd app
python main.py
