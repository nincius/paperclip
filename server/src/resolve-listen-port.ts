import detectPort from "detect-port";

function assertValidTcpListenPort(configuredPort: number): void {
  if (
    typeof configuredPort !== "number"
    || !Number.isInteger(configuredPort)
    || configuredPort < 1
    || configuredPort > 65535
  ) {
    throw new Error(
      `Invalid HTTP listen port configured: ${String(configuredPort)} (expected an integer in range 1–65535).`,
    );
  }
}

/**
 * Pick the HTTP listen port. When strict mode is on, fail if the configured
 * port is not free (detect-port would otherwise choose the next available).
 */
export async function resolveListenPort(configuredPort: number, strictListenPort: boolean): Promise<number> {
  assertValidTcpListenPort(configuredPort);
  const selected = await detectPort(configuredPort);
  if (strictListenPort && selected !== configuredPort) {
    throw new Error(
      `PAPERCLIP_STRICT_LISTEN_PORT is enabled but port ${configuredPort} is not available ` +
        `(next free port would be ${selected}). Free the port or unset PAPERCLIP_STRICT_LISTEN_PORT.`,
    );
  }
  return selected;
}
