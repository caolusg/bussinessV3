import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  buildSetupStatus,
  saveRuntimeConfig,
  startBootstrap
} from '../services/setupService.js';

const router = Router();

const configSchema = z.object({
  teacherUsername: z.string().trim().min(1).default('teacher'),
  aiEnabled: z.coerce.boolean().default(true),
  aiProvider: z.string().trim().min(1).default('deepseek'),
  aiBaseUrl: z.string().trim().min(1).default('https://api.deepseek.com'),
  aiModel: z.string().trim().min(1).default('deepseek-chat'),
  aiApiKey: z.string().trim().optional().nullable().default(null),
  aiProxyUrl: z.string().trim().optional().default(''),
  aiTimeoutMs: z.coerce.number().int().min(1000).default(15000)
});

const bootstrapSchema = configSchema.extend({
  teacherPassword: z.string().min(6)
});

router.get('/status', async (_req, res) => {
  try {
    const status = await buildSetupStatus(prisma);
    return res.status(200).json({ ok: true, data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to read setup status';
    return res.status(500).json({
      ok: false,
      code: 'STATUS_ERROR',
      error: message
    });
  }
});

router.post('/config', async (req, res) => {
  try {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_REQUEST',
        error: 'Invalid setup configuration'
      });
    }

    await saveRuntimeConfig({
      teacherUsername: parsed.data.teacherUsername,
      aiEnabled: parsed.data.aiEnabled,
      aiProvider: parsed.data.aiProvider,
      aiBaseUrl: parsed.data.aiBaseUrl,
      aiModel: parsed.data.aiModel,
      aiApiKey: parsed.data.aiApiKey?.trim() ? parsed.data.aiApiKey : null,
      aiProxyUrl: parsed.data.aiProxyUrl ?? '',
      aiTimeoutMs: parsed.data.aiTimeoutMs
    });

    const status = await buildSetupStatus(prisma);
    return res.status(200).json({ ok: true, data: status });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save setup config';
    return res.status(500).json({
      ok: false,
      code: 'CONFIG_SAVE_FAILED',
      error: message
    });
  }
});

router.post('/bootstrap', async (req, res) => {
  try {
    const parsed = bootstrapSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_REQUEST',
        error: 'Invalid bootstrap payload'
      });
    }

    const result = await startBootstrap(prisma, {
      teacherUsername: parsed.data.teacherUsername,
      teacherPassword: parsed.data.teacherPassword,
      aiEnabled: parsed.data.aiEnabled,
      aiProvider: parsed.data.aiProvider,
      aiBaseUrl: parsed.data.aiBaseUrl,
      aiModel: parsed.data.aiModel,
      aiApiKey: parsed.data.aiApiKey?.trim() ? parsed.data.aiApiKey : null,
      aiProxyUrl: parsed.data.aiProxyUrl ?? '',
      aiTimeoutMs: parsed.data.aiTimeoutMs
    });

    if (result.alreadyRunning) {
      return res.status(409).json({
        ok: false,
        code: 'BOOTSTRAP_RUNNING',
        error: 'Bootstrap is already running'
      });
    }

    return res.status(202).json({ ok: true, data: { started: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start bootstrap';
    return res.status(500).json({
      ok: false,
      code: 'BOOTSTRAP_FAILED',
      error: message
    });
  }
});

export default router;
