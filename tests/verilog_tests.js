/* Verilog engine tests, run from run_tests.js */
'use strict';
module.exports = function (DSD, ok) {
  const V = DSD.Verilog;
  console.log('Verilog engine:');
  const ha = `module half_adder(x, y, s, c);
    input x;
    input y;
    output s;
    output c;

    xor (s, x, y);   // Sum = x XOR y
    and (c, x, y);   // Carry = x AND y
endmodule`;
  const tb = `\`timescale 1ns / 1ps
module half_adder_tb;
    // Inputs
    reg x;
    reg y;
    // Outputs
    wire s;
    wire c;

    // Instantiate the Unit Under Test (UUT)
    half_adder uut (.x(x), .y(y), .s(s), .c(c));

    initial begin
        x = 0; y = 0;
        #100;  x = 0; y = 1;
        #100;  x = 1; y = 0;
        #100;  x = 1; y = 1;
        #100;
    end
endmodule`;
  const files = [{ name: 'half_adder.v', text: ha }, { name: 'half_adder_tb.v', text: tb }];
  ok(!V.check([files[0]], 'half_adder').errors.length, 'half adder syntax');
  const r = V.simulate(files, 'half_adder_tb', 1000);
  ok(!r.errors.length, 'tb simulates ' + JSON.stringify(r.errors));
  const at = (name, t) => { const sg = r.signals.find((x) => x.name === name); let v = null; for (const h of sg.hist) if (h.t <= t) v = h.v; return v ? V.fmtVal(v) : '?'; };
  const table = [50, 150, 250, 350].map((t) => [at('x', t), at('y', t), at('s', t), at('c', t)].join(''));
  console.log('  half adder waveform (x y s c):', table.join(' | '));
  ok(table.join(',') === '0000,0110,1010,1101', 'half adder waveform');
  ok(r.signals.some((x) => x.name === 'uut.s'), 'hierarchy flattened');

  // behavioural full adder + clocked counter + $display
  const beh = `module fa(input a, b, cin, output reg s, output cout);
  assign cout = (a & b) | (cin & (a ^ b));
  always @(*) s = a ^ b ^ cin;
endmodule
module counter(input clk, input rst, output reg [3:0] q);
  always @(posedge clk) if (rst) q <= 4'd0; else q <= q + 1;
endmodule
module tb;
  reg a, b, cin, clk, rst; wire s, cout; wire [3:0] q; integer i;
  fa u1(a, b, cin, s, cout);
  counter u2(.clk(clk), .rst(rst), .q(q));
  initial begin clk = 0; forever #5 clk = ~clk; end
  initial begin
    rst = 1; #12 rst = 0;
    for (i = 0; i < 8; i = i + 1) begin {a, b, cin} = i; #10 $display("%b%b%b -> %b%b", a, b, cin, cout, s); end
    $display("q=%d", q);
    $finish;
  end
endmodule`;
  const r2 = V.simulate([{ name: 'beh.v', text: beh }], 'tb', 1000);
  ok(!r2.errors.length, 'behavioural sim ' + JSON.stringify(r2.errors));
  const sums = (r2.out || []).filter((l) => l.includes('->')).map((l) => l.split('-> ')[1]);
  ok(sums.join(',') === '00,01,01,10,01,10,10,11', 'full adder outputs ' + sums.join(','));
  const qline = (r2.out || []).find((l) => l.startsWith('q='));
  ok(qline && qline.trim() === 'q= 8', 'counter after 8 clocks: ' + qline);
  console.log('  behavioural FA + counter:', sums.join(' '), '|', qline, '| $finish at', r2.finished && r2.finished.time, 'ns');

  // error reporting
  const e1 = V.check([{ name: 'h.v', text: 'module h(x, y, s);\n input x, y;\n output s;\n xor (s, x, y)\nendmodule' }], 'h');
  ok(e1.errors.length && e1.errors[0].line === 5 && /near "endmodule"/.test(e1.errors[0].msg), 'missing semicolon error ' + JSON.stringify(e1.errors));
  const e2 = V.check([{ name: 'h.v', text: 'module h(x, y, s);\n input x, y;\n output s;\n and (s, x, z);\nendmodule' }], 'h');
  ok(e2.errors.length && /<z> is not declared/.test(e2.errors[0].msg) && e2.errors[0].line === 4, 'undeclared error ' + JSON.stringify(e2.errors));
  const e3 = V.check([{ name: 'h.v', text: 'module h(x, s);\n input x;\n output reg s;\n assign s = x;\nendmodule' }], 'h');
  ok(e3.errors.length && /non-net/.test(e3.errors[0].msg), 'assign to reg error');
  console.log('  errors:', e1.errors[0].msg, '/', e2.errors[0].msg, '/', e3.errors[0].msg);

  const sy = V.synth(V.compile([files[0]]).modules, 'half_adder');
  ok(sy.cells.length === 2 && sy.luts.length === 2 && sy.luts.find((l) => l.out === 's').init === '6' && sy.luts.find((l) => l.out === 'c').init === '8', 'synthesis/LUT INIT ' + JSON.stringify(sy.luts));
  console.log('  synthesis:', sy.cells.map((c) => c.type + '→' + c.out).join(', '), '| LUTs', sy.luts.map((l) => `LUT${l.n} ${l.out} INIT=${l.init}`).join(', '));
};
