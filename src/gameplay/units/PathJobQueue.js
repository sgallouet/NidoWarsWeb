import { createFrameBudget } from "../../engine/FrameBudget.js";
import { createPathSearch } from "./pathfinding.js";

export class PathJobQueue {
  constructor({ world, budgetMs = 1.6 }) {
    this.world = world;
    this.budgetMs = budgetMs;
    this.jobs = [];
    this.nextJobId = 1;
  }

  queue({ start, destination, blockedKeys, onComplete, onFail }) {
    const id = `path-job-${this.nextJobId}`;
    const job = {
      id,
      search: createPathSearch({
        world: this.world,
        start: { column: start.column, row: start.row },
        destination: { column: destination.column, row: destination.row },
        blockedKeys: new Set(blockedKeys),
      }),
      onComplete,
      onFail,
    };

    this.nextJobId += 1;
    this.jobs.push(job);
    return id;
  }

  cancel(jobId) {
    if (!jobId) {
      return;
    }

    this.jobs = this.jobs.filter((job) => job.id !== jobId);
  }

  update() {
    if (this.jobs.length === 0) {
      return;
    }

    const budget = createFrameBudget(this.budgetMs);

    while (this.jobs.length > 0) {
      const job = this.jobs.shift();
      const isDone = job.search.step(() => budget.shouldContinue());

      if (isDone) {
        const path = job.search.getPath();

        if (path.length > 0) {
          job.onComplete(path);
        } else {
          job.onFail?.();
        }
        continue;
      }

      this.jobs.push(job);

      if (!budget.shouldContinue()) {
        return;
      }
    }
  }
}
