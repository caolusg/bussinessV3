import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { logPracticeEvent } from '../services/researchLogService.js';

const router = Router();

const stageSchema = z.enum([
  'acquisition',
  'quotation',
  'negotiation',
  'contract',
  'preparation',
  'customs',
  'settlement',
  'after_sales'
]);
type SimulationStage = z.infer<typeof stageSchema>;

const clickEventSchema = z.object({
  eventType: z.string().trim().min(1).max(120),
  page: z.string().trim().min(1).max(120),
  route: z.string().trim().min(1).max(240),
  label: z.string().trim().max(500).optional(),
  target: z.string().trim().max(120).optional(),
  sessionId: z.string().uuid().optional(),
  resourceId: z.string().uuid().optional(),
  stage: stageSchema.optional(),
  metadata: z.record(z.unknown()).optional()
});

const bodySchema = z.object({
  events: z.array(clickEventSchema).min(1).max(50)
});

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

router.post('/clicks', requireAuth, async (req, res) => {
  try {
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid analytics payload'));
    }

    const stageKeys: SimulationStage[] = [...new Set(parsed.data.events.map((event) => event.stage).filter(Boolean))] as SimulationStage[];
    const stages = stageKeys.length
      ? await prisma.businessStage.findMany({
          where: { key: { in: stageKeys } },
          select: { id: true, key: true }
        })
      : [];
    const stageIdByKey = new Map(stages.map((stage) => [stage.key, stage.id]));

    await Promise.all(
      parsed.data.events.map((event) =>
        logPracticeEvent(prisma, {
          userId: req.user?.id,
          stageId: event.stage ? stageIdByKey.get(event.stage) ?? null : null,
          sessionId: event.sessionId ?? null,
          resourceId: event.resourceId ?? null,
          eventType: event.eventType,
          metadata: {
            page: event.page,
            route: event.route,
            label: event.label ?? null,
            target: event.target ?? null,
            stage: event.stage ?? null,
            ...event.metadata
          }
        })
      )
    );

    return res.status(200).json(ok({ recorded: parsed.data.events.length }));
  } catch (error) {
    console.error('Record click analytics failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
