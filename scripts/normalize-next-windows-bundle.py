"""Normalize Next 13's Windows-only external requires before a Linux deploy.

Run after `netlify build`, before `netlify deploy --no-build` on Windows.
Only generated server JavaScript inside the function ZIP is changed.
"""
import json
from pathlib import Path
import re
from zipfile import ZipFile

root = Path.cwd().resolve()
bundle = root / '.netlify/functions/___netlify-server-handler.zip'
pattern = re.compile(r'require\(("next/[^"\n]*\\\\[^"\n]*")\)')
temporary = bundle.with_suffix('.normalized.zip')
changed = references = 0
with ZipFile(bundle) as source, ZipFile(temporary, 'w') as destination:
    for entry in source.infolist():
        data = source.read(entry.filename)
        if entry.filename.startswith('.next/server/') and entry.filename.endswith('.js'):
            text, count = pattern.subn(
                lambda match: 'require(' + json.dumps(json.loads(match[1]).replace('\\', '/')) + ')',
                data.decode('utf-8'),
            )
            if count:
                data = text.encode('utf-8')
                changed += 1
                references += count
                unpacked = root / '.netlify/functions-internal/___netlify-server-handler' / entry.filename
                if unpacked.is_file():
                    unpacked.write_bytes(data)
        destination.writestr(entry, data)
temporary.replace(bundle)
print(f'Normalized {references} module paths in {changed} generated files.')
