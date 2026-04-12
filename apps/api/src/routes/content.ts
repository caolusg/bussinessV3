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

const resourceEventSchema = z.object({
  resourceId: z.string().uuid()
});

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

router.get('/stages', requireAuth, async (_req, res) => {
  try {
    const stages = await prisma.businessStage.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        tasks: {
          where: { isActive: true, isDefault: true },
          take: 1
        },
        resources: {
          where: { isActive: true },
          orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }]
        },
        aiScenarios: {
          where: { isActive: true, isDefault: true },
          take: 1
        }
      }
    });

    return res.status(200).json(ok(stages));
  } catch (error) {
    console.error('List content stages failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/stages/:stage/task', requireAuth, async (req, res) => {
  try {
    const parsed = stageSchema.safeParse(req.params.stage);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid stage'));
    }

    const stage = await prisma.businessStage.findUnique({
      where: { key: parsed.data },
      include: {
        tasks: {
          where: { isActive: true, isDefault: true },
          take: 1
        }
      }
    });

    if (!stage) {
      return res.status(404).json(fail('NOT_FOUND', 'Stage not found'));
    }

    return res.status(200).json(ok({
      stage,
      task: stage.tasks[0] ?? null
    }));
  } catch (error) {
    console.error('Get stage task failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/stages/:stage/resources', requireAuth, async (req, res) => {
  try {
    const parsed = stageSchema.safeParse(req.params.stage);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid stage'));
    }

    const stage = await prisma.businessStage.findUnique({
      where: { key: parsed.data }
    });
    if (!stage) {
      return res.status(404).json(fail('NOT_FOUND', 'Stage not found'));
    }

    const resources = await prisma.learningResource.findMany({
      where: { stageId: stage.id, isActive: true },
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }]
    });

    const grouped = resources.reduce<Record<string, typeof resources>>((acc, resource) => {
      acc[resource.type] = acc[resource.type] ?? [];
      acc[resource.type].push(resource);
      return acc;
    }, {});

    await logPracticeEvent(prisma, {
      userId: req.user?.id,
      stageId: stage.id,
      eventType: 'resource_list_viewed',
      metadata: { stage: parsed.data }
    });

    return res.status(200).json(ok({ stage, resources, grouped }));
  } catch (error) {
    console.error('Get stage resources failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/resources/viewed', requireAuth, async (req, res) => {
  try {
    const parsed = resourceEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid resource'));
    }

    const resource = await prisma.learningResource.findUnique({
      where: { id: parsed.data.resourceId }
    });
    if (!resource) {
      return res.status(404).json(fail('NOT_FOUND', 'Resource not found'));
    }

    await logPracticeEvent(prisma, {
      userId: req.user?.id,
      stageId: resource.stageId,
      resourceId: resource.id,
      eventType: 'resource_viewed',
      metadata: {
        resourceType: resource.type,
        term: resource.term
      }
    });

    return res.status(200).json(ok({ resourceId: resource.id }));
  } catch (error) {
    console.error('Log resource viewed failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
