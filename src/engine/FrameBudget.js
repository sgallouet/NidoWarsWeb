export function createFrameBudget(budgetMs) {
  const start = now();
  const deadline = start + budgetMs;
  let hasAllowedWork = false;

  return {
    shouldContinue() {
      if (!hasAllowedWork) {
        hasAllowedWork = true;
        return true;
      }

      return now() < deadline;
    },
  };
}

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}
