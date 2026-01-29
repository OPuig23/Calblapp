from pathlib import Path
lines = Path('src/services/autoAssign.ts').read_text().splitlines()
for i, line in enumerate(lines, 1):
    if 260 <= i <= 360:
        print(f"{i}: {line}")
