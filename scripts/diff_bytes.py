from pathlib import Path

a = Path("_actual_block.txt").read_bytes()
b = Path("_old_block.txt").read_bytes()
for i, (x, y) in enumerate(zip(a, b)):
    if x != y:
        Path("_diff.txt").write_text(f"diff at {i}: {x!r} vs {y!r}\ncontext a: {a[max(0,i-20):i+20]!r}\ncontext b: {b[max(0,i-20):i+20]!r}")
        break
else:
    Path("_diff.txt").write_text(f"len a={len(a)} len b={len(b)}")
