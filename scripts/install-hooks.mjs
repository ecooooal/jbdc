// Point git at the checked-in hooks. Runs from `prepare` on install; outside a
// git checkout (CI tarball, packaged install) there is nothing to do.
import { execFileSync } from 'node:child_process';

try {
  execFileSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' });
  execFileSync('git', ['config', 'core.hooksPath', '.githooks'], {
    stdio: 'ignore',
  });
} catch {
  // Not a git checkout.
}
