import type { FastifyInstance } from "fastify";
import { spin, type MachineConfig } from "../../../../packages/slot-engine/dist/index.js";
import machine from "../../../../packages/slot-engine/src/config/sample.noirHeist.5x3.20l.json" assert { type: "json" };

// In real usage: fetch machine config by machineId from DB/config service
const MACHINES: Record<string, MachineConfig> = {
  [machine.id]: machine as unknown as MachineConfig
};

export async function slotsRoutes(app: FastifyInstance) {
  app.post("/slots/spin", async (req, reply) => {
    const body = req.body as {
      machineId: string;
      stake: number;
      denom?: number;
      seed?: string;
      requestId?: string;
    };

    const cfg = MACHINES[body.machineId];
    if (!cfg) return reply.code(404).send({ error: "Unknown machineId" });

    const result = spin({
      machine: cfg,
      bet: { stake: body.stake, denom: body.denom },
      seed: body.seed,
      requestId: body.requestId
    });

    return reply.send(result);
  });
}
