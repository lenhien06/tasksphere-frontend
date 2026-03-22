from pathlib import Path

t = Path("app/invites/accept/page.tsx").read_text(encoding="utf-8")
i = t.find("} else if (statusCode === 409)")
Path("_repr.txt").write_text(repr(t[i - 15 : i + 200]), encoding="utf-8")

old = Path("scripts/patch_accept.py").read_text(encoding="utf-8")
# extract accept_old between accept_old = """ and """
start = old.find('accept_old = """') + len('accept_old = """')
end = old.find('"""', start)
block = old[start:end]
Path("_old_block.txt").write_text(block, encoding="utf-8")

actual_start = t.find("            } else if (statusCode === 409) {")
actual = t[actual_start : actual_start + len(block)]
Path("_actual_block.txt").write_text(actual, encoding="utf-8")
Path("_cmp.txt").write_text(f"same={actual==block}\nlen actual={len(actual)} len block={len(block)}", encoding="utf-8")
