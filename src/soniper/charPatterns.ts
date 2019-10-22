import * as text from "../util/text";

const patterns = [
  `
   rr
   rr
  cccc 
  yy
 y  y
y    y
`,
  `
y    y
 y  y
  yy
  cc
 crrc
c rr c
`,
  `
 cppc
ccppcc
pppppp
pppppp
ccppcc
 cppc
`,
  `
 rppr
rrpprr
pppppp
pppppp
rrpprr
 rppr
`,
  `
brrbrr
bbbbrr
brrbrr
brrbrr
brrbbb
brrbrr
`,
  `
rr
rr
`,
  `
yyyyyy
y    y
y    y
y    y
y    y
yyyyyy
`,
  `
gggggg
g    g
g    g
g    g
g    g
gggggg
`,
  `
rggggr
gr  rg
g rr g
g rr g
gr  rg
rggggr
`,
  `
l
     l
l 
     l
l
     l
`,
  `
ll
    ll
ll
    ll
ll
    ll
`,
  `
lll
   lll
lll
   lll
lll
   lll
`,
  `
llll
  llll
llll
  llll
llll
  llll
`,
  `
lllll
 lllll
lllll
 lllll
lllll
 lllll
`
];

export function init() {
  text.defineSymbols(patterns, "A");
}
