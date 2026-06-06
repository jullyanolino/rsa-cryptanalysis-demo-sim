/* ============================================================
   content.js — chapter & step definitions
   buildChapters(state) returns fully-resolved chapters so the
   panel + 3D re-render whenever a slider changes.
   Author: Jullyano Lino
   ============================================================ */
(function (global) {
  "use strict";
  const M = global.RSAMath;

  const PRIMES = [3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71];

  // rail metadata (static)
  const CHAPTERS_META = [
    { t: "RSA, from scratch", s: "Keys · encrypt · sign" },
    { t: "Breaking RSA", s: "Four classical attacks" },
    { t: "Shor's quantum attack", s: "Period-finding factoring" },
  ];

  const SHOR_CASES = {
    "15": { N: 15, a: 7, r: 4, nq: 4, Q: 16 },
    "21": { N: 21, a: 2, r: 6, nq: 5, Q: 24 },
  };

  function clampPrimeIndex(i) { return Math.max(0, Math.min(PRIMES.length - 1, i | 0)); }

  function buildChapters(state) {
    const p = PRIMES[clampPrimeIndex(state.pi)];
    const q = PRIMES[clampPrimeIndex(state.qi)];
    const rsa = M.rsaFromPQ(p, q, 17);
    const n = Number(rsa.n), phi = Number(rsa.phi), e = Number(rsa.e), d = Number(rsa.d);
    let msg = Math.max(2, Math.min(state.M, n - 1));
    const C = Number(M.modexp(msg, e, n));
    // encryption hops: 1, m, m^2 ... m^e (mod n)
    const encSeq = M.modSequence(msg, n, e);    // length e+1
    // signing demo
    const docHash = parseInt(M.demoHash("Contract.pdf").slice(0, 4), 16) % n;
    const sig = Number(M.modexp(docHash, d, n));

    // ---- chapter 1 : RSA ----
    const ch1 = {
      title: "RSA, from scratch",
      steps: [
        {
          tag: "One-way multiplication",
          viz: { key: "lattice", params: { p, q, mode: "reveal" } },
          title: "The lock is easy, the key is hard",
          lead: `RSA rests on one lopsided fact: multiplying two primes is <strong>instant</strong>, but splitting the product back apart is <strong>practically impossible</strong> when the primes are large.`,
          body: [
            `Each dot on the stage is one unit of <code>n</code>. Because <code>n = p·q</code>, the dots snap into a perfect <code>${p} × ${q}</code> rectangle — that grid <em>is</em> the secret factorisation.`,
            `Hand someone only the loose pile of <code>${n}</code> dots and ask them to find the rectangle. For 2048-bit primes there are more candidate widths than atoms in the observable universe.`,
          ],
          callout: { type: "", h: "Intuition", text: "Public key = the product. Private key = the two factors. Security = the gap between the two." },
          math: [
            { lab: "prime p", val: p },
            { lab: "prime q", val: q },
            { lab: "n = p · q", val: n, hl: true },
          ],
          controls: [{ type: "primes" }],
        },
        {
          tag: "Key generation",
          viz: { key: "lattice", params: { p, q, mode: "reveal" } },
          title: "Building the key pair",
          lead: `From the two primes we derive a <strong>public key</strong> <code>(n, e)</code> for locking and a <strong>private key</strong> <code>(n, d)</code> for unlocking.`,
          body: [
            `First we count the integers below <code>n</code> that share no factor with it — Euler's totient <code>φ(n) = (p−1)(q−1)</code>. This is the hidden gear the private key turns on.`,
            `We pick a public exponent <code>e</code> coprime to <code>φ(n)</code>, then compute <code>d</code> as its modular inverse: the unique number with <code>e·d ≡ 1 (mod φ(n))</code>. Only someone who knows <code>p</code> and <code>q</code> can find <code>d</code>.`,
          ],
          callout: { type: "good", h: "The trapdoor", text: `Knowing p and q makes d trivial to compute. Without them, finding d is as hard as factoring n itself.` },
          math: [
            { lab: "φ(n)", val: `(${p}−1)(${q}−1) = ${phi}` },
            { lab: "public e", val: e, hl: true },
            { lab: "private d", val: `e⁻¹ mod φ(n) = ${d}`, hl: true },
            { lab: "check", val: `e·d mod φ(n) = ${(e * d) % phi}` },
          ],
          controls: [{ type: "primes" }],
        },
        {
          tag: "Encryption  ·  C = Mᵉ mod n",
          viz: { key: "clock", params: { N: n, values: encSeq, label: `${msg}^k mod ${n}`, stepDur: 0.45 } },
          title: "Encrypting a message",
          lead: `To encrypt the number <code>M = ${msg}</code> we raise it to the public exponent and wrap it around a clock of size <code>n</code>: <code>C = M<sup>e</sup> mod n</code>.`,
          body: [
            `Watch the marker hop around the ring. Each step multiplies by <code>M</code> again and folds back inside <code>[0, n)</code>. After <code>e = ${e}</code> hops it lands on the ciphertext.`,
            `The path looks chaotic — and that scrambling is the point. Without <code>d</code>, there is no shortcut back to where we started.`,
          ],
          callout: { type: "", h: "Try it", text: "Drag the message slider and watch the landing point jump to a completely different spot on the ring." },
          math: [
            { lab: "message M", val: msg },
            { lab: "C = Mᵉ mod n", val: `${msg}^${e} mod ${n} = ${C}`, hl: true },
          ],
          controls: [{ type: "message", max: Math.min(n - 1, 200) }],
        },
        {
          tag: "Decryption  ·  M = Cᵈ mod n",
          viz: { key: "clock", params: { N: n, values: [C, msg], label: `${C}^d mod ${n}`, stepDur: 1.2 } },
          title: "Decryption unwinds it",
          lead: `Raising the ciphertext to the <strong>private</strong> exponent <code>d</code> lands exactly back on the original message: <code>M = C<sup>d</sup> mod n</code>.`,
          body: [
            `The reason is pure number theory. Because <code>e·d ≡ 1 (mod φ(n))</code>, the two exponents are inverse rotations — applying both returns every point to its start (Euler's theorem).`,
            `So the same clock that scrambled <code>M</code> into <code>C</code> now carries <code>C</code> straight home. Only <code>d</code> knows the way.`,
          ],
          callout: { type: "good", h: "Round trip", text: `C^d mod n = ${C}^${d} mod ${n} = ${Number(M.modexp(C, d, n))}  —  the message is recovered exactly.` },
          math: [
            { lab: "ciphertext C", val: C },
            { lab: "M = Cᵈ mod n", val: `→ ${Number(M.modexp(C, d, n))}`, hl: true },
          ],
        },
        {
          tag: "Digital signatures",
          viz: { key: "clock", params: { N: n, values: M.modSequence(docHash, n, Math.min(d > 30 ? 18 : d, 18)), label: `sign(hash)`, stepDur: 0.5 } },
          title: "Signing flips the keys",
          lead: `Signatures run RSA <strong>backwards</strong>: the owner signs with the <em>private</em> key, and anyone verifies with the <em>public</em> key.`,
          body: [
            `We never sign the whole document — we hash it to a short fingerprint first, then raise that to <code>d</code>. The result is a signature only the private-key holder could have produced.`,
            `A verifier raises the signature to <code>e</code>; if it matches the document's hash, the signature is authentic and the document untampered.`,
          ],
          callout: { type: "good", h: "Authenticity", text: `hash("Contract.pdf") = ${docHash}  →  signature = ${sig}. Anyone can check it; nobody can forge it without d.` },
          math: [
            { lab: "hash(doc)", val: docHash },
            { lab: "signature", val: `hash^d mod n = ${sig}`, hl: true },
            { lab: "verify", val: `sig^e mod n = ${Number(M.modexp(sig, e, n))}` },
          ],
        },
      ],
    };

    // ---- chapter 2 : attacks ----
    // a deliberately breakable small key for factoring demo
    const fp = PRIMES[clampPrimeIndex(state.fpi)], fq = PRIMES[clampPrimeIndex(state.fqi)];
    const fn = fp * fq;
    const fac = M.factorTrial(fn);
    const ch2 = {
      title: "Breaking RSA",
      steps: [
        {
          tag: "Attack 1  ·  Brute-force factoring",
          viz: { key: "lattice", params: { p: fp, q: fq, mode: "factor" } },
          title: "Factoring by brute force",
          lead: `The most direct attack: just <strong>try every divisor</strong>. The dots rearrange into 2, 3, 4… columns until they tile perfectly — that width is a factor.`,
          body: [
            `A leftover row (shown in red) means the divisor doesn't fit. The first clean rectangle reveals <code>p</code> and <code>q</code>, and the key is broken.`,
            `You only need to test up to <code>√n</code>, but that is still astronomically large for real keys. Here <code>n = ${fn}</code> falls in microseconds; a 2048-bit <code>n</code> would outlast the universe.`,
          ],
          callout: { type: "warn", h: "Why it fails on real RSA", text: `Trial division is O(√n). Doubling the key size squares the work — that exponential wall is RSA's whole defence.` },
          math: [
            { lab: "n", val: fn },
            { lab: "√n bound", val: Number(M.isqrt(fn)) },
            { lab: "factors", val: fac.factors ? `${fac.factors[0]} × ${fac.factors[1]}` : "—", hl: true },
          ],
          controls: [{ type: "factor-primes" }],
        },
        {
          tag: "Attack 2  ·  Wiener (tiny private key)",
          viz: { key: "lattice", params: { p, q, mode: "reveal" } },
          title: "Wiener: when d is too small",
          lead: `Choosing a small <code>d</code> to speed up decryption is a fatal mistake. If <code>d < n<sup>1/4</sup>/3</code>, Wiener's attack recovers it from the <strong>public key alone</strong>.`,
          body: [
            `The trick is continued fractions. The ratio <code>e/n</code> has a sequence of best rational approximations (convergents); one of them is exactly <code>k/d</code>, handing over the private key.`,
            `Each convergent is tested instantly, so the whole attack runs in milliseconds regardless of key size.`,
          ],
          callout: { type: "warn", h: "Lesson", text: "Never trade a small private exponent for speed. Use the standard e = 65537 and let d be large." },
          math: [
            { lab: "public e", val: e },
            { lab: "e / n", val: `convergents → k/d` },
            { lab: "recovered d", val: d, hl: true },
          ],
        },
        {
          tag: "Attack 3  ·  Common modulus",
          viz: { key: "clock", params: { N: n, values: [msg, C, Math.max(2, (C * 7) % n), msg], label: "two keys, one n", stepDur: 0.8 } },
          title: "Sharing one modulus",
          lead: `Suppose two users share the same <code>n</code> but have different exponents <code>e₁, e₂</code>, and the same message is sent to both. An eavesdropper recovers it with <strong>no factoring at all</strong>.`,
          body: [
            `Because <code>e₁</code> and <code>e₂</code> are coprime, the extended Euclidean algorithm finds integers <code>a, b</code> with <code>a·e₁ + b·e₂ = 1</code>.`,
            `Then <code>C₁<sup>a</sup> · C₂<sup>b</sup> ≡ M (mod n)</code> — the message pops out directly from the two ciphertexts.`,
          ],
          callout: { type: "warn", h: "Lesson", text: "Never share a modulus across users. Every key pair needs its own freshly generated n." },
          math: [
            { lab: "given", val: "C₁, C₂, e₁, e₂, n" },
            { lab: "Bézout", val: "a·e₁ + b·e₂ = 1" },
            { lab: "recover M", val: "C₁ᵃ · C₂ᵇ mod n", hl: true },
          ],
        },
        {
          tag: "Attack 4  ·  Håstad broadcast",
          viz: { key: "interference", params: { Q: 12, r: 3 } },
          title: "Håstad: small e, many recipients",
          lead: `With <code>e = 3</code> and no padding, sending the <em>same</em> message to three recipients leaks it. Three ciphertexts combine into <code>M³</code> — and a plain cube root finishes the job.`,
          body: [
            `Each recipient has a different modulus <code>n₁, n₂, n₃</code>. The Chinese Remainder Theorem stitches the three congruences into one value modulo <code>n₁n₂n₃</code>.`,
            `Since <code>M³</code> is smaller than that product, the combined value <em>equals</em> <code>M³</code> exactly — take the integer cube root and read off <code>M</code>.`,
          ],
          callout: { type: "warn", h: "Lesson", text: "Always pad messages (OAEP). Textbook RSA with small e is broken by design." },
          math: [
            { lab: "given", val: "C₁,C₂,C₃ with e=3" },
            { lab: "CRT", val: "→ M³ mod n₁n₂n₃" },
            { lab: "recover M", val: "∛(M³)", hl: true },
          ],
        },
      ],
    };

    // ---- chapter 3 : Shor ----
    const sc = SHOR_CASES[state.shor] || SHOR_CASES["15"];
    const period = M.findPeriod(sc.a, sc.N);
    const fromR = M.factorsFromPeriod(sc.a, sc.N, period);
    const seq = M.modSequence(sc.a, sc.N, period * 2 + 1);
    const ch3 = {
      title: "Shor's quantum attack",
      steps: [
        {
          tag: "Step 1  ·  Reduce to period-finding",
          viz: { key: "lattice", params: { p: sc.N === 15 ? 3 : 3, q: sc.N === 15 ? 5 : 7, mode: "reveal" } },
          title: "Turn factoring into a rhythm",
          lead: `Shor's leap: <strong>factoring is the same as finding a period</strong>. Pick a base <code>a</code> coprime to <code>N</code> and look at the sequence <code>a, a², a³, … mod N</code>.`,
          body: [
            `That sequence always repeats with some period <code>r</code>. Once you know <code>r</code>, simple arithmetic — <code>gcd(a<sup>r/2</sup> ± 1, N)</code> — usually hands you the factors.`,
            `The catch: finding <code>r</code> on a classical computer is as hard as factoring. A quantum computer finds it almost instantly.`,
          ],
          callout: { type: "", h: "Setup", text: `Target N = ${sc.N}, base a = ${sc.a}, with gcd(${sc.a}, ${sc.N}) = 1. We need the period r.` },
          math: [
            { lab: "target N", val: sc.N },
            { lab: "base a", val: sc.a },
            { lab: "goal", val: "find period r of aˣ mod N", hl: true },
          ],
          controls: [{ type: "shor-case" }],
        },
        {
          tag: "Step 2  ·  Quantum superposition",
          viz: { key: "qubits", params: { nQubits: sc.nq } },
          title: "Every input at once",
          lead: `A register of <code>${sc.nq}</code> qubits, each passed through a Hadamard gate, holds all <code>2<sup>${sc.nq}</sup> = ${Math.pow(2, sc.nq)}</code> possible exponents <strong>simultaneously</strong>.`,
          body: [
            `Watch each qubit's state vector tip from a definite <code>|0⟩</code> to the equator — an equal blend of <code>0</code> and <code>1</code>. Together they form a uniform superposition over every input.`,
            `A single evaluation of the oracle <code>U<sub>f</sub></code> then computes <code>a<sup>x</sup> mod N</code> for <em>all</em> of them at once. This massive parallelism is the quantum advantage.`,
          ],
          callout: { type: "", h: "Intuition", text: "Classically you'd try inputs one by one. Quantumly you evaluate the whole function in a single shot — then must cleverly extract the period." },
          math: [
            { lab: "counting qubits", val: sc.nq },
            { lab: "superposed states", val: Math.pow(2, sc.nq), hl: true },
            { lab: "oracle", val: "Uf : |x⟩ → |x, aˣ mod N⟩" },
          ],
          controls: [{ type: "shor-case" }],
        },
        {
          tag: "Step 3  ·  The hidden period",
          viz: { key: "clock", params: { N: sc.N, values: seq, label: `${sc.a}^k mod ${sc.N}`, stepDur: 0.75, loopCycle: true } },
          title: "The period is a loop",
          lead: `Plot <code>${sc.a}<sup>k</sup> mod ${sc.N}</code> on a clock of size <code>${sc.N}</code> and the marker traces a closed loop — it returns to <code>1</code> after exactly <strong>r = ${period}</strong> steps.`,
          body: [
            `That repeating cycle <code>${seq.slice(0, period + 1).join(" → ")} → …</code> is the period the whole algorithm is hunting for.`,
            `The quantum state now encodes this rhythm across all its amplitudes — but measuring it directly would just give one random value. We need to read out the <em>frequency</em>, not a point.`,
          ],
          callout: { type: "good", h: "Found the rhythm", text: `${sc.a}^${period} mod ${sc.N} = 1  →  period r = ${period}.` },
          math: [
            { lab: "sequence", val: seq.slice(0, period + 1).join(", ") + ", …" },
            { lab: "period r", val: period, hl: true },
          ],
          controls: [{ type: "shor-case" }],
        },
        {
          tag: "Step 4  ·  Quantum Fourier Transform",
          viz: { key: "interference", params: { Q: sc.Q, r: period } },
          title: "Interference reveals the frequency",
          lead: `The Quantum Fourier Transform makes the amplitudes <strong>interfere</strong>. Wrong answers cancel out; multiples of the true frequency reinforce into sharp peaks.`,
          body: [
            `The phasors above show why: at a peak bin every contribution points the same way and adds up; elsewhere they fan out and sum to nearly zero.`,
            `The surviving peaks sit at multiples of <code>Q/r</code>. Their spacing is <code>${sc.Q}/${period} = ${sc.Q / period}</code> — read off the spacing and you read off the period.`,
          ],
          callout: { type: "", h: "Constructive vs destructive", text: "This is the core quantum trick: orchestrate interference so the answer you want is the only thing left standing." },
          math: [
            { lab: "register size Q", val: sc.Q },
            { lab: "peak spacing", val: `Q/r = ${sc.Q}/${period} = ${sc.Q / period}` },
            { lab: "extracted r", val: period, hl: true },
          ],
          controls: [{ type: "shor-case" }],
        },
        {
          tag: "Step 5  ·  From period to factors",
          viz: { key: "lattice", params: { p: fromR ? fromR.f1 : 3, q: fromR ? fromR.f2 : 5, mode: "reveal" } },
          title: "Classical finish",
          lead: `With the period <code>r = ${period}</code> in hand, the computer drops back to ordinary arithmetic and <strong>reads off the factors</strong>.`,
          body: [
            `Compute <code>a<sup>r/2</sup> mod N = ${fromR ? fromR.half : "—"}</code>, then take <code>gcd(a<sup>r/2</sup> ± 1, N)</code>. The two results are the prime factors of <code>N</code>.`,
            `The dots settle into a clean <code>${fromR ? fromR.f1 : "?"} × ${fromR ? fromR.f2 : "?"}</code> rectangle — <code>N = ${sc.N}</code> is factored, and an RSA key of this form is broken.`,
          ],
          callout: { type: "good", h: "Cracked", text: fromR ? `gcd(${fromR.half}±1, ${sc.N}) = ${fromR.f1} and ${fromR.f2}.  ${sc.N} = ${fromR.f1} × ${fromR.f2}.` : "Factors recovered from the period." },
          math: [
            { lab: "a^(r/2) mod N", val: fromR ? fromR.half : "—" },
            { lab: "gcd(·−1, N)", val: fromR ? fromR.f1 : "—" },
            { lab: "gcd(·+1, N)", val: fromR ? fromR.f2 : "—" },
            { lab: "result", val: fromR ? `${sc.N} = ${fromR.f1} × ${fromR.f2}` : "—", hl: true },
          ],
          controls: [{ type: "shor-case" }],
        },
      ],
    };

    return [ch1, ch2, ch3];
  }

  global.Content = { buildChapters, CHAPTERS_META, PRIMES, SHOR_CASES };
})(window);
