import type { ShortlistRow } from './types'

export type ColFormat = 'pct' | 'times' | 'ratio' | 'bool'

export interface ColConfig {
  field: keyof ShortlistRow
  label: string
  format: ColFormat
}

/** Maps every criterion ID → its ShortlistRow field + display config */
export const COLUMN_MAP: Record<string, ColConfig> = {
  revenueGrowth:       { field: 'revenue_growth_yoy', label: 'REV GR.',    format: 'pct'   },
  epsGrowth:           { field: 'eps_growth_yoy',     label: 'EPS GR.',    format: 'pct'   },
  roe:                 { field: 'roe',                label: 'ROE',        format: 'pct'   },
  grossMargin:         { field: 'gross_margin',       label: 'GROSS M.',   format: 'pct'   },
  operatingMargin:     { field: 'operating_margin',   label: 'OP. M.',     format: 'pct'   },
  fcfGrowth:           { field: 'fcf_growth',         label: 'FCF GR.',    format: 'pct'   },
  netProfitMargin:     { field: 'net_profit_margin',  label: 'NET M.',     format: 'pct'   },
  rdPercent:           { field: 'rd_percent',         label: 'R&D %',      format: 'pct'   },
  earningsConsistency: { field: 'peg_ratio',           label: 'PEG',        format: 'times' },
  peRelative:          { field: 'roa',                label: 'ROA',        format: 'pct'   },
  peLtMarket:          { field: 'pe_ratio',           label: 'P/E',        format: 'times' },
  pb:                  { field: 'pb_ratio',           label: 'P/B',        format: 'times' },
  fcfPositive:         { field: 'fcf_margin',         label: 'FCF M.',     format: 'pct'   },
  debtEquity:          { field: 'debt_equity',        label: 'D/E',        format: 'ratio' },
  evEbitda:            { field: 'ev_ebitda',          label: 'EV/EBITDA',  format: 'times' },
  dividendYield:       { field: 'dividend_yield',     label: 'DIV. YLD.',  format: 'pct'   },
  priceToSales:        { field: 'price_to_sales',     label: 'P/S',        format: 'times' },
  currentRatio:        { field: 'current_ratio',      label: 'CURR. R.',   format: 'ratio' },
  interestCoverage:    { field: 'interest_coverage',  label: 'INT. COV.',  format: 'times' },
  priceFCF:            { field: 'price_fcf',          label: 'P/FCF',      format: 'times' },
}

/** Layman descriptions for the info tooltip on each criterion */
export const CRITERION_DESCRIPTIONS: Record<string, string> = {
  revenueGrowth:       'Is the company growing its sales faster than 15% per year? Strong revenue growth signals rising demand.',
  epsGrowth:           'Is the company earning more profit per share year-over-year (target 10%+)? Rising EPS means the business is becoming more valuable.',
  roe:                 'For every $1 shareholders invested, how much profit does the company earn? Above 15% means capital is used efficiently.',
  grossMargin:         'After producing its goods, how much of each dollar of revenue is left as profit? 40%+ indicates pricing power.',
  operatingMargin:     'After paying salaries, rent, and running costs, what % of revenue remains? 15%+ shows an efficiently run business.',
  fcfGrowth:           'Is the company generating more real cash year-over-year? Free cash flow growth confirms that profits are turning into actual money.',
  netProfitMargin:     'Out of every $1 earned, how many cents become bottom-line profit? A 10%+ net margin signals a well-run, profitable business.',
  rdPercent:           'Is the company reinvesting 8%+ of revenue into research & development? High R&D spend suggests a commitment to future innovation.',
  earningsConsistency: 'PEG = P/E divided by EPS growth rate. A PEG below 1.5 suggests you are not overpaying for the company\'s growth. Only valid when EPS growth is positive.',
  peRelative:          'Return on Assets measures how efficiently the company turns its total asset base into profit. Above 5% indicates strong capital efficiency.',
  peLtMarket:          'Price-to-Earnings ratio below 20× means you are paying a reasonable price for each dollar of earnings. Lower is more attractively valued.',
  pb:                  'Are you paying less than 2× the company\'s book value (assets minus debts)? A low P/B can indicate a stock trading below its intrinsic worth.',
  fcfPositive:         'FCF Margin = Free Cash Flow divided by Revenue. Positive FCF Margin means the company actually converts revenue into real cash after all capital spending.',
  debtEquity:          'Is total debt below total equity (ratio < 1)? Low debt reduces financial risk and gives flexibility during downturns.',
  evEbitda:            'Total company value relative to operating earnings. An EV/EBITDA below 15× is often considered reasonably priced.',
  dividendYield:       'Does the company pay shareholders a dividend of 2%+ per year? A healthy dividend signals confidence in future earnings.',
  priceToSales:        'How much are you paying for each $1 of the company\'s annual revenue? A P/S below 3× can suggest the stock is not overpriced.',
  currentRatio:        'Can the company pay all its short-term bills with current assets? A ratio above 1.5× means good short-term financial health.',
  interestCoverage:    'Can the company cover its interest payments 5× or more from earnings? High coverage means low risk of defaulting on debt.',
  priceFCF:            'How much are you paying for each $1 of free cash flow generated? A P/FCF below 25× is generally considered a reasonable valuation.',
}

/** Default 7 dashboard columns shown to first-time users (4 Growth + 3 Value) */
export const DEFAULT_DASHBOARD_COLS = [
  // Growth — top 4 most informative
  'revenueGrowth', 'epsGrowth', 'roe', 'operatingMargin',
  // Value — top 3 most informative
  'peLtMarket', 'evEbitda', 'debtEquity',
]
