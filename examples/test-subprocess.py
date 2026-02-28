#!/usr/bin/env python3
"""
Example script that simulates an LLM by echoing the prompt
and streaming output word-by-word.

Usage: python test-subprocess.py "Your prompt here"
"""

import sys
import time

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No prompt provided", file=sys.stderr)
        sys.exit(1)
    
    prompt = sys.argv[1]
    
    # Simulate streaming response
    response = f"This is a simulated LLM response to: {prompt[:50]}..."
    
    # Stream word by word
    words = response.split()
    for i, word in enumerate(words):
        print(word, end=' ' if i < len(words) - 1 else '\n', flush=True)
        time.sleep(0.1)  # Simulate streaming delay
