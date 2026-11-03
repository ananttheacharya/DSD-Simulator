# DSD Lab Simulator

Breadboard and trainer-kit simulator for the Digital System Design lab
(BIT Mesra, Off-Campus Jaipur). Every experiment of
`DSD_Lab_Manual_All_Experiments.pdf` can be built on a virtual trainer kit and
checked by the simulator.

**Open `index.html` in a browser.** Nothing to install. Progress and boards are
kept in the browser (localStorage). It also runs inside BitHub Jaipur at
`<site>/dsd/index.html`, opened from the **DSD** button on the Jaipur page.

## Experiments

| No. | Experiment | Parts (each has its own board, diagram and completed build) |
|---|---|---|
| 1 | NOT, OR, EXOR gates | NOT (7404) · OR (7432) · EXOR (7486) |
| 2 | Half adder & half subtractor | Half adder · Half subtractor |
| 3 | Full adder & full subtractor | Full adder · Full subtractor |
| 4 | 7-segment display with 7447 | 7447 → 2×7404 → 330 Ω → CC display |
| 5 | Binary ↔ Gray code | Binary → Gray · Gray → Binary |
| 6 | SR latch, SR & JK flip-flops | SR latch · clocked SR FF · JK FF |
| 7 | 555 timer | Monostable · Astable (with CRO) |
| 8 | 74138 decoder & 74151 MUX | Decoder · MUX (F = Σm(1,2,6,7)) |
| 9 | 7485 magnitude comparator | 4-bit comparator |
| 10 | CMOS NOT with CD4007 | MOSFET inverter |
| 11 | CMOS NAND & NOR with CD4007 | NAND · NOR |
| 12 | Verilog half adder in Xilinx ISE | Simulated ISE Project Navigator + ISim |

## How it simulates

- **Gate-level ICs** (`core/ics.js`, from Better ALUU): every chip is a gate
  network checked exhaustively against an independent datasheet model. A chip
  works only when its VCC pin reaches +5 V and its GND pin reaches ground
  through your wires; reversed supply burns it.
- **Digital engine** (`core/sim.js`, grown from Better ALUU's `netsim.js`):
  0/1/X/Z values, one unit of delay per gate, TTL floating inputs read HIGH,
  open-collector 7447 outputs, contention detection, persistent state for
  latches. The PULSE button gives a narrow clock pulse; holding the clock HIGH
  on a JK flip-flop with J = K = 1 shows race-around.
- **CD4007** is simulated at switch level (each MOSFET joins its source and
  drain when ON).
- **555 timer** (`core/analog.js`): nodal analysis with backward-Euler
  capacitors, the internal 5k/5k/5k divider and the discharge transistor.
  The astable reference measures 578 Hz against 584 Hz in theory.
- **Verilog** (`core/verilog.js`): parser, elaborator, event-driven 4-state
  simulator and a small synthesizer (RTL view, LUT mapping) for the ISE mock.

## Code

```
core/logic.js       3-valued logic helpers (Better ALUU)
core/ics.js         IC library: 7400 7402 7404 7408 7432 7486 7447 7485 74138 74151 555 CD4007
core/board.js       trainer kit + 830-point breadboard, netlist extraction
core/sim.js         digital simulator
core/analog.js      555 transient solver
core/refbuild.js    turns a logical netlist into a real wired board ("completed experiment")
core/experiments.js the twelve experiments: apparatus, I/O map, tasks, procedure, reference circuit
core/checks.js      observation tables, automatic verification, diagnostics
core/verilog.js     Verilog subset compiler/simulator/synthesizer
web/kit.js          trainer-kit drawing and interaction
web/sheets.js       pin-numbered schematic sheets and DIP pinouts
web/scope.js        oscilloscope
web/manual.js       lab-manual viewer (pages pre-rendered from the PDF)
web/ise.js          Xilinx ISE Project Navigator + ISim mock
web/tour.js         first-visit tour
web/app.js          the page
```

## Tests

```
node tests/run_tests.js
```

Checks every IC model against its datasheet, runs every reference build
through its observation tasks, removes each required wire in turn to prove the
verifier notices, checks reversed power, race-around and dead shorts, and runs
the Verilog engine on the manual's half adder and test fixture.

## Updating BitHub

```
tools/sync-to-bithub.sh
```

copies this folder into `BitHub-Jaipur/Front-End New/public/dsd` (served at
`./dsd/index.html` after `npm run build`).
