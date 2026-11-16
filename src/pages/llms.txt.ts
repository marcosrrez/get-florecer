import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { GLOSSARY } from '../data/glossary';

export async function GET(context: APIContext) {
    const site = (context.site?.toString() || 'https://getflorecer.com').replace(/\/$/, '');
    const posts = (await getCollection('blog')).sort(
        (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );

    const learningPosts = posts.filter(
        (p) => p.data.category === 'Learning & Child Development' || p.data.tags.includes('learning-science')
    );
    const researchPosts = posts.filter((p) => !learningPosts.includes(p));

    const lines: string[] = [
        '# Florecer Mind',
        '',
        '> Where Research Blooms into Wisdom. Florecer Mind transforms peer-reviewed research from counseling, neuroscience, cognitive science, and child development into accessible, practical wisdom for everyday people, parents, and clinicians.',
        '',
        `- Website: ${site}`,
        '- Editorial Team: The Florecer Team',
        '- Contact: team@getflorecer.com',
        `- RSS Feed: ${site}/rss.xml`,
        `- Sitemap: ${site}/sitemap-index.xml`,
        '',
        '## Editorial Standards',
        '- Every spotlight is grounded in primary peer-reviewed studies, meta-analyses, or clinical literature.',
        '- Articles are drafted with AI assistance and human-reviewed against cited primary sources by The Florecer Team before publication.',
        '',
        '## Core Pages',
        `- [Home](${site}/): Overview of Florecer Mind and latest research spotlights.`,
        `- [Research Spotlights](${site}/blog/): Full archive of peer-reviewed mental health and neuroscience articles.`,
        `- [The Embodied Soul & The Developing Brain](${site}/learning/): Special series on learning science, executive function, grit, and child development, with spaced-repetition Orbit practice and an interactive concept lexicon.`,
        `- [Resources](${site}/resources/): Therapist directories, crisis support lines (988, Crisis Text Line, SAMHSA), and evidence-based learning tools.`,
        `- [About](${site}/about/): Mission, verification methodology, and editorial standards.`,
        `- [Newsletter](${site}/newsletter/): Research Rescue Weekly and Embodied Soul dispatches.`,
        '',
        '## The Embodied Soul & The Developing Brain (Series)',
        ...learningPosts.map(
            (p) => `- [${p.data.title}](${site}/blog/${p.slug}/): ${p.data.description}`
        ),
        '',
        '## Research Spotlights',
        ...researchPosts.map(
            (p) => `- [${p.data.title}](${site}/blog/${p.slug}/): ${p.data.description}`
        ),
        '',
        '## Concept Lexicon (Key Terms)',
        ...GLOSSARY.map((g) => `- **${g.term}** (${g.category}): ${g.definition}`),
        ''
    ];

    return new Response(lines.join('\n'), {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8'
        }
    });
}
