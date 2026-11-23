import type { ReadinessProbe } from "../ports/readiness-probe.js";

export class CheckReadiness {
  constructor(private readonly probe: ReadinessProbe) {}

  execute(): Promise<boolean> {
    return this.probe.isReady();
  }
}
