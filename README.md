# RSA & Shor's Algorithm — An Interactive Cryptography Lab

An interactive educational web application that explains the foundations of **RSA cryptography**, demonstrates **classical attacks**, and introduces **Shor's quantum factoring algorithm** through dynamic visualizations and hands-on experimentation.

Developed by **Jullyano Lino**
**SENAI/CIMATEC University**

---

## Overview

Understanding why RSA is secure—and why large-scale quantum computers threaten that security—can be challenging when concepts are presented only through equations.

This project transforms those concepts into an interactive learning experience by combining:

* Mathematical demonstrations
* Real-time parameter manipulation
* 3D visualizations
* Animated cryptographic processes
* Step-by-step guided explanations

Rather than serving as an RSA implementation for production use, this application is intended as a **didactic laboratory** for cybersecurity and quantum computing education.

---

## Features

### RSA Fundamentals

* Prime number selection
* RSA key generation
* Euler's Totient computation
* Public and private key construction
* Modular exponentiation
* Encryption and decryption workflow
* Digital signature demonstration

---

### Classical RSA Attacks

Interactive demonstrations of concepts such as:

* Integer factorization
* Trial division intuition
* Weak parameter selection
* Cryptanalytic reasoning

These demonstrations are educational and intended to illustrate why proper parameter choices matter.

---

### Shor's Algorithm

Visualization of the main ideas behind quantum factoring:

* Period finding
* Quantum register intuition
* Modular arithmetic cycles
* Quantum interference
* Quantum Fourier Transform intuition

The objective is conceptual understanding rather than simulation of a fault-tolerant quantum computer.

---

### Interactive Controls

Users can experiment with parameters including:

* Prime values
* Messages
* Factoring examples
* Different Shor demonstration cases

The interface updates calculations and visualizations dynamically.

---

## Architecture

```text
.
│
├── index.html          # Application entry point
│
├── css/
│     styles.css        # Styling
│
├── js/
│     app.js            # Application controller
│     content.js        # Educational content and chapter definitions
│     crypto.js         # RSA and mathematical engine
│     scenes.js         # Three.js visualization engine
│
└── screens/
      *.png             # Images and documentation assets
```

---

## Technologies

* HTML5
* CSS3
* JavaScript (ES6)
* Three.js
* BigInt arithmetic
* Browser Local Storage

No backend is required.

---

## Educational Structure

The application is organized into three major chapters:

1. **RSA from Scratch**

   * One-way multiplication
   * Key generation
   * Encryption
   * Decryption
   * Digital signatures

2. **Breaking RSA**

   * Classical factorization intuition
   * Security assumptions
   * Attack demonstrations

3. **Shor's Quantum Attack**

   * Period finding
   * Quantum states
   * Interference
   * Factoring intuition

---

## Running Locally

Clone the repository:

```bash
git clone https://github.com/<your-username>/<repository>.git
```

Enter the project directory:

```bash
cd <repository>
```

Start a local web server, for example:

```bash
python -m http.server 8000
```

Then open:

```
http://localhost:8000
```

Opening the project through a local server is recommended instead of directly opening `index.html`.

---

## Intended Audience

This project is suitable for:

* Cybersecurity students
* Computer science students
* Quantum computing learners
* Cryptography instructors
* Technical workshops and demonstrations

---

## Disclaimer

This application is an educational visualization tool. It is **not** intended to provide production-grade cryptographic implementations or to simulate a full-scale quantum computer. The demonstrations are simplified to facilitate conceptual understanding.

---

## Author

**Jullyano Lino**

SENAI/CIMATEC University

Research interests include:

* Cybersecurity
* Applied Cryptography
* Quantum Computing
* Post-Quantum Cryptography
* Quantum Communications

---

## License

This project is intended for academic and educational purposes. Please add an appropriate license (e.g., MIT, Apache-2.0, or GPL-3.0) before public distribution.
