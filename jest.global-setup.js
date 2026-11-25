// Pin the test clock so literal date assertions do not depend on the runner's
// timezone. Jest forks its workers after globalSetup, so they inherit this.
module.exports = () => {
  process.env.TZ = "UTC";
};
