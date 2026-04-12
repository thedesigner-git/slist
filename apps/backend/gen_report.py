import sys, os
sys.path.insert(0, '.')
os.environ.setdefault('DATABASE_URL', 'postgresql://postgres:Alphascreen2026@db.agabayflfwbzuisycqla.supabase.co:5432/postgres')

from db import Session
from agent.scoring import compute_ttm_metrics, score_company
from criteria_defs import build_default_settings, ALL_CRITERIA
from models.company import Company
from unittest.mock import MagicMock

db = Session()
companies = db.query(Company).all()

defaults = build_default_settings()
settings = MagicMock()
settings.growth_enabled = True
settings.value_enabled = True
settings.growth_pass_threshold = defaults['growth_pass_threshold']
settings.value_pass_threshold = defaults['value_pass_threshold']
settings.shortlist_threshold = defaults['shortlist_threshold']
settings.criteria = defaults['criteria']

rows = []
for co in companies:
    ttm = compute_ttm_metrics(db, co.id, market=co.market or 'US')
    score = score_company(ttm, settings)
    rows.append({'ticker': co.ticker, 'name': co.name, 'market': co.market, 'ttm': ttm, 'score': score})

db.close()

growth_criteria = [c for c in ALL_CRITERIA if c.preset == 'growth']
value_criteria  = [c for c in ALL_CRITERIA if c.preset == 'value']


def fmt_val(cdef, val):
    if val is None:
        return '<span class="na-val">N/A</span>'
    if cdef.is_boolean:
        return '<span class="bool-yes">Yes</span>' if val else '<span class="bool-no">No</span>'
    if cdef.suffix == '%':
        return f'{val * 100:.1f}%'
    if cdef.suffix == 'x':
        return f'{val:.2f}x'
    return f'{val:.2f}'


def fmt_threshold(cdef):
    if cdef.is_boolean:
        return 'Yes'
    if cdef.default_threshold is None:
        return '-'
    if cdef.suffix == '%':
        return f'{cdef.direction} {cdef.default_threshold * 100:.0f}%'
    if cdef.suffix == 'x':
        return f'{cdef.direction} {cdef.default_threshold:.0f}x'
    return f'{cdef.direction} {cdef.default_threshold}'


def passes(cdef, val):
    if val is None:
        return None  # N/A
    if cdef.is_boolean:
        return bool(val)
    if cdef.default_threshold is None:
        return None
    if cdef.direction == '>':
        return float(val) > float(cdef.default_threshold)
    return float(val) < float(cdef.default_threshold)


def result_cell(cdef, val):
    p = passes(cdef, val)
    if p is None:
        return '<span class="res-na">N/A</span>'
    return '<span class="res-pass">Pass</span>' if p else '<span class="res-fail">Fail</span>'


def criteria_rows(criteria_list, ttm):
    out = ''
    for cdef in criteria_list:
        val = ttm.get(cdef.metric_key)
        on_tag = '<span class="tag-on">ON</span>' if cdef.default_enabled else '<span class="tag-off">OFF</span>'
        out += (
            f'<tr>'
            f'<td class="crit-name">{cdef.label}{on_tag}</td>'
            f'<td class="crit-val">{fmt_val(cdef, val)}</td>'
            f'<td class="crit-thresh">{fmt_threshold(cdef)}</td>'
            f'<td class="crit-result">{result_cell(cdef, val)}</td>'
            f'</tr>\n'
        )
    return out


cards = ''
for r in rows:
    t = r['ttm']
    s = r['score']
    shortlisted = s['is_shortlisted']
    badge_cls = 'badge-yes' if shortlisted else 'badge-no'
    badge_txt = 'SHORTLISTED' if shortlisted else 'NOT SHORTLISTED'
    g_cls = 'stat-green' if s['growth_passed'] else 'stat-red'
    v_cls = 'stat-green' if s['value_passed'] else 'stat-red'

    cards += f'''
<div class="card">
  <div class="card-head">
    <div class="card-ident">
      <span class="cticker">{r["ticker"]}</span>
      <span class="cname">{r["name"]} &middot; {r["market"]}</span>
    </div>
    <span class="{badge_cls}">{badge_txt}</span>
  </div>
  <div class="scorerow">
    <div class="sstat">Score<strong class="stat-orange">{s["score"] * 100:.0f}%</strong></div>
    <div class="sstat">Criteria<strong class="stat-orange">{s["criteria_passed"]}/{s["criteria_total"]}</strong></div>
    <div class="sstat">Growth<strong class="{g_cls}">{"Pass" if s["growth_passed"] else "Fail"}</strong></div>
    <div class="sstat">Value<strong class="{v_cls}">{"Pass" if s["value_passed"] else "Fail"}</strong></div>
  </div>
  <table>
    <thead><tr><th>Criterion</th><th>Value</th><th>Threshold</th><th>Result</th></tr></thead>
    <tbody>
      <tr class="section-row"><td colspan="4">Growth Criteria</td></tr>
      {criteria_rows(growth_criteria, t)}
      <tr class="section-row"><td colspan="4">Value Criteria</td></tr>
      {criteria_rows(value_criteria, t)}
    </tbody>
  </table>
</div>
'''

html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Alphascreen - All Metrics</title>
<style>
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 32px; }}
h1 {{ color: #f97316; font-size: 18px; font-weight: 700; margin-bottom: 4px; }}
.sub {{ color: #555; font-size: 12px; margin-bottom: 28px; }}
.sub .on {{ color: #4ade80; font-weight: 600; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(540px, 1fr)); gap: 20px; }}
.card {{ background: #111; border: 1px solid #1f1f1f; border-radius: 10px; overflow: hidden; }}
.card-head {{ display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid #1a1a1a; }}
.card-ident {{ flex: 1; }}
.cticker {{ font-size: 20px; font-weight: 800; color: #f97316; display: block; }}
.cname {{ font-size: 12px; color: #555; }}
.badge-yes {{ background: #14532d; color: #4ade80; border: 1px solid #166534; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }}
.badge-no  {{ background: #1a1a1a; color: #555; border: 1px solid #2a2a2a; font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 20px; white-space: nowrap; }}
.scorerow {{ display: flex; gap: 24px; padding: 10px 18px; background: #0d0d0d; border-bottom: 1px solid #1a1a1a; }}
.sstat {{ font-size: 11px; color: #555; }}
.sstat strong {{ display: block; font-size: 15px; font-weight: 700; }}
.stat-orange {{ color: #f97316; }}
.stat-green  {{ color: #22c55e; }}
.stat-red    {{ color: #ef4444; }}
table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
thead th {{ padding: 6px 12px 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .7px; color: #444; text-align: left; background: #0d0d0d; border-bottom: 1px solid #1a1a1a; }}
tbody tr:hover {{ background: #161616; }}
td {{ padding: 6px 12px; border-bottom: 1px solid #161616; }}
.section-row td {{ background: #0f0f0f; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #3a3a3a; padding: 7px 12px; }}
.crit-name {{ color: #999; }}
.crit-val {{ font-weight: 600; color: #e5e5e5; font-variant-numeric: tabular-nums; text-align: right; }}
.crit-thresh {{ color: #444; text-align: right; }}
.crit-result {{ text-align: center; width: 60px; }}
.res-pass {{ color: #22c55e; font-weight: 700; }}
.res-fail {{ color: #ef4444; font-weight: 700; }}
.res-na   {{ color: #3a3a3a; }}
.na-val   {{ color: #3a3a3a; }}
.bool-yes {{ color: #22c55e; font-weight: 600; }}
.bool-no  {{ color: #ef4444; font-weight: 600; }}
.tag-on  {{ display: inline-block; background: #14301a; color: #4ade80; font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 3px; margin-left: 5px; vertical-align: middle; letter-spacing: .3px; }}
.tag-off {{ display: inline-block; background: #1a1a1a; color: #444; font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 3px; margin-left: 5px; vertical-align: middle; letter-spacing: .3px; }}
</style>
</head>
<body>
<h1>Alphascreen - All 20 Metrics</h1>
<p class="sub">5 companies &middot; live yfinance data &middot; default criteria: 5 growth + 5 value &nbsp;<span class="on">ON</span> = enabled by default</p>
<div class="grid">
{cards}
</div>
</body>
</html>'''

out = 'D:/claude/260326 first project/Alphascreen/data_test.html'
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('Written to', out)
