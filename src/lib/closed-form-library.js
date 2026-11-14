// Closed-form discovery library.
//
// This is the editable source of truth for which named
// constants the independent search engine may use.
//
// Numerical values for existing tokens come from
// constant_engine/symbols/symbols.csv.
//
// Set enabled: false to exclude an entry.
// Add new tokens here as the library develops.

export const CLOSED_FORM_LIBRARY = [
  { token: 'G_Gi', enabled: true },
  { token: 's', enabled: true },
  { token: 'V_fe', enabled: true },
  { token: 'L', enabled: true },
  { token: 'K', enabled: true },
  { token: 'L_1', enabled: true },
  { token: 'C_d', enabled: true },
  { token: 'L_2', enabled: true },
  { token: 'D_d', enabled: true },
  { token: 'C_U', enabled: true },
  { token: 'pi', enabled: true },
  { token: 'G_Ga', enabled: true },
  { token: 'P_up', enabled: true },
  { token: 'S', enabled: true },
  { token: 'omega_2', enabled: true },
  { token: 'D_Do', enabled: true },
  { token: 'e', enabled: true },
  { token: 'e_pi', enabled: true },
  { token: 'e_gamma', enabled: true },
  { token: 'C_CFP', enabled: true },
  { token: 'x_infinity', enabled: true },
  { token: 'W_We', enabled: true },
  { token: 'L_LL', enabled: true },
  { token: 'M', enabled: true },
  { token: 'C_Q', enabled: true },
  { token: 'P', enabled: true },
  { token: 'j_01', enabled: true },
  { token: 'L_Li', enabled: true },
  { token: 'zeta_2', enabled: true },
  { token: 'zeta_3', enabled: true },
  { token: 'C_CF', enabled: true },
  { token: 'C_R1', enabled: true },
  { token: 'F*', enabled: true },
  { token: 'rho_prime', enabled: true },
  { token: 'V_5_2', enabled: true },
  { token: 'V_6_1', enabled: true },
  { token: 'V_7_2', enabled: true },
  { token: 'V_8_1', enabled: true },
  { token: 'V_9_2', enabled: true },
  { token: 'V_10_1', enabled: true },
  { token: 'V_11a247', enabled: true },
  { token: 'V_12a803', enabled: true },
  { token: 'V_13a3143', enabled: true },
];

// Additional real constants used by the Closed-Form Explorer.
// Keep their numerical definitions in one shared location.
export const CLOSED_FORM_ADDITIONS = Object.freeze([
  {
    token: 'rho_prime',
    name: 'prime constant',
    value: '0.414682509851111660248109622',
    dimension: '-'
  },
  {
    token: 'V_5_2',
    name: 'volume of the 5_2 knot complement',
    value: '2.8281220883307831627638988092766349427709813173006494770435203272588025483224716309369470179299991074',
    dimension: '-'
  },
  {
    token: 'V_6_1',
    name: 'volume of the 6_1 knot complement',
    value: '3.1639632288831439839910147159731544848127876715181152665829224419755659849630848398717252885615033467',
    dimension: '-'
  },
  {
    token: 'V_7_2',
    name: 'volume of the 7_2 knot complement',
    value: '3.3317442316411148239145691080297127955469579091860049212216044555987413728423665155788622603487862838',
    dimension: '-'
  },
  {
    token: 'V_8_1',
    name: 'volume of the 8_1 knot complement',
    value: '3.4272052462740162198635395900533060307058393707238053472622670270069375703531481117035581689583422190',
    dimension: '-'
  },
  {
    token: 'V_9_2',
    name: 'volume of the 9_2 knot complement',
    value: '3.4866601462950435898006128915367003198421186664239660615017870182130079238900210248050845919500911203',
    dimension: '-'
  },
  {
    token: 'V_10_1',
    name: 'volume of the 10_1 knot complement',
    value: '3.5261959907353757174499755657142716330635327679338191278063213641573173488861600312944113398139065160',
    dimension: '-'
  },
  {
    token: 'V_11a247',
    name: 'volume of the 11a_247 knot complement',
    value: '3.5538199185120429749208220995732950549156739474134096702619450802281945700158132866523428106560197127',
    dimension: '-'
  },
  {
    token: 'V_12a803',
    name: 'volume of the 12a_803 knot complement',
    value: '3.5738825405591410148064423668527379116213828252526035416896723348612670095906202273503670518843210103',
    dimension: '-'
  },
  {
    token: 'V_13a3143',
    name: 'volume of the 13a_3143 knot complement',
    value: '3.5889139177918995891985106559984915798272624070554396199231128686480448577616088127261832281665406180',
    dimension: '-'
  }
]);

export const CLOSED_FORM_RULES = {
  allowedOperations: ['multiply', 'divide'],
  allowUnaryNegative: true,
  allowAdditiveExpressions: false,

  complexityMin: 1,
  complexityMax: 10,
  complexityDefault: 3,

  maxIntegerComponent: 288,
};

// Count a nonzero rational coefficient in reduced form.
// 7/12 -> 2 parts
// 1/12 -> 1 part
// 7/1  -> 1 part
// 1/1  -> 1 part
export function rationalComponentCount(numerator, denominator) {
  let n = BigInt(numerator);
  let d = BigInt(denominator);

  if (n === 0n || d === 0n) {
    throw new Error('Rational components must be nonzero.');
  }

  n = n < 0n ? -n : n;
  d = d < 0n ? -d : d;

  const gcd = (a, b) => {
    while (b !== 0n) {
      [a, b] = [b, a % b];
    }
    return a;
  };

  const divisor = gcd(n, d);
  n /= divisor;
  d /= divisor;

  const count = Number(n !== 1n) + Number(d !== 1n);
  return Math.max(1, count);
}

export function enabledClosedFormConstants() {
  return CLOSED_FORM_LIBRARY
    .filter(entry => entry.enabled)
    .map(entry => entry.token);
}
