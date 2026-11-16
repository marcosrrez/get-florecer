import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

export const prerender = false;

interface PageStats {
    path: string;
    views: number;
    totalSeconds: number;
    avgSeconds: number;
    lastViewedAt: string;
}

export const GET: APIRoute = async ({ request }) => {
    const syncToken =
        import.meta.env.ANALYTICS_TOKEN ||
        process.env.ANALYTICS_TOKEN ||
        import.meta.env.SUBSCRIBE_SYNC_TOKEN ||
        process.env.SUBSCRIBE_SYNC_TOKEN;
    const authHeader = request.headers.get('authorization') || '';

    if (!syncToken || authHeader !== `Bearer ${syncToken}`) {
        return new Response(JSON.stringify({ ok: false, error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const store = getStore('analytics');
        const listResult = await store.list();
        const pages: PageStats[] = [];

        for (const item of listResult.blobs || []) {
            try {
                const record = (await store.get(item.key, { type: 'json' })) as PageStats | null;
                if (record) pages.push(record);
            } catch {
                // Skip unreadable entry
            }
        }

        pages.sort((a, b) => b.views - a.views);
        return new Response(JSON.stringify({ ok: true, pages }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    } catch {
        return new Response(JSON.stringify({ ok: true, pages: [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();
        const rawPath = String(body.path || '/').trim();
        const path = rawPath.startsWith('/') ? rawPath.slice(0, 200) : '/';
        const duration = Math.max(0, Math.min(3600, Math.round(Number(body.duration) || 0)));

        // Ignore non-public or preview paths
        if (path.startsWith('/api/') || path.startsWith('/instagram')) {
            return new Response(JSON.stringify({ ok: true }), { status: 200 });
        }

        try {
            const store = getStore('analytics');
            const key = encodeURIComponent(path);
            const existing = (await store.get(key, { type: 'json' })) as PageStats | null;
            const views = (existing?.views || 0) + 1;
            const totalSeconds = (existing?.totalSeconds || 0) + duration;

            await store.setJSON(key, {
                path,
                views,
                totalSeconds,
                avgSeconds: Math.round(totalSeconds / views),
                lastViewedAt: new Date().toISOString()
            });
        } catch {
            // Non-fatal in local dev without Netlify Blobs context
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch {
        return new Response(JSON.stringify({ ok: false }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
