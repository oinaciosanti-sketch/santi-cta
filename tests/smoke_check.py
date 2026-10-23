"""Verificações estáticas offline; não substituem deploy/testes com Supabase real."""
from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
app=(r/'src/App.jsx').read_text()
drive=(r/'src/Drive.jsx').read_text()
sql=(r/'supabase/migration_v11_drive.sql').read_text()
assert json.loads((r/'package.json').read_text())['dependencies']['qrcode.react']
assert "pathname.startsWith('/agendar')" in (r/'src/main.jsx').read_text()
assert 'drive_slots' in drive and 'drive_book' in drive and 'drive_manage' in drive
assert 'SANTI DRIVE' in app and 'Agendado' in sql
assert 'pg_advisory_xact_lock' in sql
assert 'ENABLE ROW LEVEL SECURITY' in sql
assert 'REVOKE ALL ON public.drive_appointments FROM anon' in sql
assert 'ON CONFLICT (phone)' in sql
assert (r/'supabase/functions/drive-reminders/index.ts').exists()
print('OK: 9 verificações estáticas passaram. Não valida SQL no servidor nem fluxo real.')
