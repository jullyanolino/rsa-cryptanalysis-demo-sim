/* ============================================================
   crypto.js — educational RSA / attacks / Shor math engine
   Pure functions. BigInt for modular arithmetic safety.
   Author: Jullyano Lino
   ============================================================ */
(function (global) {
  "use strict";

  // ---- basic integer helpers (BigInt) ----
  const B = (x) => BigInt(x);

  function gcdBig(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b) { [a, b] = [b, a % b]; }
    return a;
  }

  // extended euclid: returns [g, x, y] with a*x + b*y = g
  function egcd(a, b) {
    let old_r = a, r = b;
    let old_s = 1n, s = 0n;
    let old_t = 0n, t = 1n;
    while (r !== 0n) {
      const q = old_r / r;
      [old_r, r] = [r, old_r - q * r];
      [old_s, s] = [s, old_s - q * s];
      [old_t, t] = [t, old_t - q * t];
    }
    return [old_r, old_s, old_t];
  }

  function modinv(a, m) {
    a = ((a % m) + m) % m;
    const [g, x] = egcd(a, m);
    if (g !== 1n) return null;
    return ((x % m) + m) % m;
  }

  function modexp(base, exp, mod) {
    base = B(base) % B(mod);
    exp = B(exp);
    mod = B(mod);
    if (mod === 1n) return 0n;
    let result = 1n;
    if (base < 0n) base += mod;
    while (exp > 0n) {
      if (exp & 1n) result = (result * base) % mod;
      exp >>= 1n;
      base = (base * base) % mod;
    }
    return result;
  }

  // integer sqrt (BigInt)
  function isqrt(n) {
    n = B(n);
    if (n < 0n) throw new Error("isqrt negative");
    if (n < 2n) return n;
    let x = n, y = (x + 1n) / 2n;
    while (y < x) { x = y; y = (x + n / x) / 2n; }
    return x;
  }

  // integer k-th root (BigInt) — returns floor
  function iroot(n, k) {
    n = B(n); k = B(k);
    if (n < 0n) throw new Error("iroot negative");
    if (n < 2n) return n;
    let lo = 0n, hi = 1n;
    while (powBig(hi, k) <= n) hi <<= 1n;
    while (lo < hi - 1n) {
      const mid = (lo + hi) >> 1n;
      if (powBig(mid, k) <= n) lo = mid; else hi = mid;
    }
    return lo;
  }
  function powBig(b, e) {
    let r = 1n;
    for (let i = 0n; i < e; i++) r *= b;
    return r;
  }

  // ---- primality (Miller-Rabin, deterministic for small) ----
  function isPrime(n) {
    n = B(n);
    if (n < 2n) return false;
    const small = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];
    for (const p of small) {
      if (n === p) return true;
      if (n % p === 0n) return false;
    }
    let d = n - 1n, r = 0n;
    while (d % 2n === 0n) { d /= 2n; r++; }
    for (const a of small) {
      if (a >= n) continue;
      let x = modexp(a, d, n);
      if (x === 1n || x === n - 1n) continue;
      let cont = false;
      for (let i = 0n; i < r - 1n; i++) {
        x = (x * x) % n;
        if (x === n - 1n) { cont = true; break; }
      }
      if (!cont) return false;
    }
    return true;
  }

  function nthPrimesUpTo(limit) {
    const out = [];
    for (let i = 2; i <= limit; i++) if (isPrime(i)) out.push(i);
    return out;
  }

  // ---- RSA from primes p,q with optional e ----
  function rsaFromPQ(p, q, ePref) {
    p = B(p); q = B(q);
    const n = p * q;
    const phi = (p - 1n) * (q - 1n);
    let e = ePref ? B(ePref) : 65537n;
    if (gcdBig(e, phi) !== 1n || e >= phi) {
      // search for a small valid e
      const candidates = [17n, 3n, 5n, 7n, 11n, 13n, 19n, 23n, 65537n];
      e = null;
      for (const c of candidates) {
        if (c < phi && gcdBig(c, phi) === 1n) { e = c; break; }
      }
      if (e === null) {
        let c = 3n;
        while (gcdBig(c, phi) !== 1n) c += 2n;
        e = c;
      }
    }
    const d = modinv(e, phi);
    return { p, q, n, phi, e, d };
  }

  // ---- brute force factoring (trial division up to sqrt) ----
  function factorTrial(n, maxSteps) {
    n = B(n);
    const lim = isqrt(n);
    const steps = [];
    let found = null;
    let count = 0;
    for (let i = 2n; i <= lim; i++) {
      count++;
      if (n % i === 0n) { found = [i, n / i]; steps.push({ d: i, hit: true }); break; }
      if (steps.length < (maxSteps || 40)) steps.push({ d: i, hit: false });
    }
    return { factors: found, tested: count, bound: lim, steps };
  }

  // ---- continued fraction convergents (for Wiener) ----
  function continuedFraction(num, den) {
    num = B(num); den = B(den);
    const cf = [];
    while (den !== 0n) {
      const a = num / den;
      cf.push(a);
      [num, den] = [den, num - a * den];
    }
    return cf;
  }
  function convergents(cf) {
    const out = [];
    let h0 = 1n, h1 = cf[0];
    let k0 = 0n, k1 = 1n;
    out.push([h1, k1]);
    for (let i = 1; i < cf.length; i++) {
      const a = cf[i];
      const h2 = a * h1 + h0;
      const k2 = a * k1 + k0;
      out.push([h2, k2]);
      h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    }
    return out;
  }

  // Wiener attack: recover d when d is small
  function wienerAttack(e, n) {
    e = B(e); n = B(n);
    const cf = continuedFraction(e, n);
    const conv = convergents(cf);
    const trace = [];
    for (let i = 0; i < conv.length; i++) {
      const [k, d] = conv[i];
      if (k === 0n) { trace.push({ k, d, ok: false }); continue; }
      // phi = (e*d - 1) / k must be integer
      if ((e * d - 1n) % k !== 0n) { trace.push({ k, d, ok: false }); continue; }
      const phi = (e * d - 1n) / k;
      // solve x^2 - (n - phi + 1)x + n = 0 -> integer roots are p,q
      const bb = n - phi + 1n;
      const disc = bb * bb - 4n * n;
      if (disc < 0n) { trace.push({ k, d, ok: false }); continue; }
      const s = isqrt(disc);
      if (s * s === disc && (bb + s) % 2n === 0n) {
        trace.push({ k, d, ok: true });
        return { d, trace };
      }
      trace.push({ k, d, ok: false });
    }
    return { d: null, trace };
  }

  // common modulus attack
  function commonModulus(c1, c2, e1, e2, n) {
    e1 = B(e1); e2 = B(e2); n = B(n); c1 = B(c1); c2 = B(c2);
    const [g, a, b] = egcd(e1, e2);
    if (g !== 1n) return null;
    let m = 1n;
    // m = c1^a * c2^b mod n  (handle negative exponents via inverse)
    if (a < 0n) {
      const inv = modinv(c1, n);
      m = (m * modexp(inv, -a, n)) % n;
    } else {
      m = (m * modexp(c1, a, n)) % n;
    }
    if (b < 0n) {
      const inv = modinv(c2, n);
      m = (m * modexp(inv, -b, n)) % n;
    } else {
      m = (m * modexp(c2, b, n)) % n;
    }
    return { m, a, b };
  }

  // CRT for a list of (residue, modulus)
  function crt(residues, moduli) {
    let N = 1n;
    for (const m of moduli) N *= B(m);
    let x = 0n;
    for (let i = 0; i < moduli.length; i++) {
      const ni = B(moduli[i]);
      const Ni = N / ni;
      const inv = modinv(Ni, ni);
      x = (x + B(residues[i]) * Ni * inv) % N;
    }
    return { x: ((x % N) + N) % N, N };
  }

  // Hastad broadcast (e=3): given c_i = m^e mod n_i for 3 recipients
  function hastadAttack(cs, ns, e) {
    e = B(e);
    const { x, N } = crt(cs.map(B), ns.map(B));
    const m = iroot(x, e);
    return { combined: x, modulus: N, m };
  }

  // ---- Shor helpers (classical period emulation) ----
  // sequence a^x mod N for x = 0..len
  function modSequence(a, N, len) {
    a = B(a); N = B(N);
    const seq = [];
    let cur = 1n;
    for (let x = 0; x <= len; x++) {
      seq.push(Number(cur));
      cur = (cur * a) % N;
    }
    return seq;
  }
  function findPeriod(a, N) {
    a = B(a); N = B(N);
    let cur = a % N, r = 1;
    while (cur !== 1n) { cur = (cur * a) % N; r++; if (r > 100000) break; }
    return r;
  }
  // factors from period
  function factorsFromPeriod(a, N, r) {
    a = B(a); N = B(N);
    if (r % 2 !== 0) return null;
    const half = modexp(a, B(r / 2), N);
    if (half === N - 1n) return null;
    const f1 = gcdBig(half - 1n, N);
    const f2 = gcdBig(half + 1n, N);
    return { f1: Number(f1), f2: Number(f2), half: Number(half) };
  }

  // tiny deterministic "hash" for the signing demo (NOT secure — display only)
  function demoHash(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h.toString(16).padStart(8, "0");
  }

  global.RSAMath = {
    gcdBig, egcd, modinv, modexp, isqrt, iroot, isPrime, nthPrimesUpTo,
    rsaFromPQ, factorTrial, continuedFraction, convergents, wienerAttack,
    commonModulus, crt, hastadAttack, modSequence, findPeriod,
    factorsFromPeriod, demoHash, B
  };
})(window);
