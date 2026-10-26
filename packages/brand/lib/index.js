/**
 * LimiX cover — node half.
 *
 * The package contributes browser presentation only: this empty `apply` gives
 * the Loader a host-side row while the browser half ships through the
 * `./client` export declared in `package.json`.
 */

/** Host plugin body — no host-side behaviour. */
function apply() {}

export { apply };
