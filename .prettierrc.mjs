// Prettier defaults, with one exception: printWidth 100. The codebase reads at
// ~100 columns, and the 600-line test-size guard assumes that density — at
// Prettier's default 80 a pure reformat pushes three test files past it.
// The config is the source of truth, so the owner's editor follows it too.
export default {
  printWidth: 100,
};
