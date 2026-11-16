#!/usr/bin/env node
/**
 * Automated No-AI-Slop copy linter for Florecer Mind.
 * Checks Markdown articles (or specified files) against banned words,
 * empty filler phrases, slop patterns, and em-dash limits from:
 *   .claude/skills/no-ai-slop/SKILL.md
 *   .claude/skills/no-ai-slop/eval.md
 *
 * Usage:
 *   node scripts/lint-no-ai-slop.mjs [file1.md file2.md ...]
 *   (defaults to all files in src/content/blog/*.md)
 */

import fs from 'node:fs';
import path from 'node:path';

const BANNED_WORDS = [
    'delve',
    'foster',
    'leverage',
    'utilize',
    'facilitate',
    'empower',
    'streamline',
    'robust',
    'cutting-edge',
    'paradigm shift',
    'game changer',
    'this is huge',
    'this changes everything',
    'tapestry',
    'realm',
    'beacon',
    'multifaceted',
    'meticulous',
    'intricate',
    'paramount',
    'transformative',
    'elevate',
    'embark',
    'supercharge',
    'harness',
    'ever-evolving'
];

const EMPTY_PHRASES = [
    "it's worth noting",
    "it's important to note",
    'at the end of the day',
    'when it comes to',
    'at its core',
    "in today's world",
    'in the age of',
    'in the world of',
    'the reality is',
    'the truth is',
    'in terms of',
    'with regard to',
    'in order to',
    'going forward',
    'in this article',
    "let's dive in"
];

const SLOP_PATTERNS = [
    { name: 'Throat-clearing opener', regex: /\b(here's the thing|here's what i mean|let me be clear|i'll be honest|the uncomfortable truth is)\b/gi },
    { name: 'Faux-insight setup', regex: /\b(this is the part most people skip|what most people get wrong|here's what nobody tells you|the part everyone misses)\b/gi },
    { name: 'Importance puffery', regex: /\b(stands as a testament|marks a pivotal moment|plays a vital role|solidifies its position|underscores its significance)\b/gi },
    { name: 'Weasel attribution', regex: /\b(experts agree|industry reports suggest|many argue|widely regarded as)\b/gi },
    { name: 'Summary-recap ending', regex: /^(in conclusion|ultimately|overall),?\s/gim }
];

const MAX_EM_DASHES_PER_ARTICLE = 2;

function stripFrontmatter(raw) {
    if (!raw.startsWith('---')) return { body: raw, frontmatterLines: 0 };
    const end = raw.indexOf('\n---', 3);
    if (end === -1) return { body: raw, frontmatterLines: 0 };
    const fm = raw.slice(0, end + 4);
    const body = raw.slice(end + 4);
    return { body, frontmatterLines: fm.split('\n').length - 1 };
}

function lintFile(filePath) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { body, frontmatterLines } = stripFrontmatter(raw);
    const lines = body.split('\n');
    const errors = [];
    const warnings = [];

    lines.forEach((line, idx) => {
        const lineNum = frontmatterLines + idx + 1;

        for (const word of BANNED_WORDS) {
            const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            let match;
            while ((match = re.exec(line)) !== null) {
                errors.push({
                    line: lineNum,
                    rule: 'banned-word',
                    message: `Banned word "${match[0]}"`,
                    excerpt: line.trim()
                });
            }
        }

        for (const phrase of EMPTY_PHRASES) {
            const re = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
            let match;
            while ((match = re.exec(line)) !== null) {
                warnings.push({
                    line: lineNum,
                    rule: 'empty-phrase',
                    message: `Often-empty phrase "${match[0]}"`,
                    excerpt: line.trim()
                });
            }
        }

        for (const pat of SLOP_PATTERNS) {
            pat.regex.lastIndex = 0;
            let match;
            while ((match = pat.regex.exec(line)) !== null) {
                errors.push({
                    line: lineNum,
                    rule: pat.name.toLowerCase().replace(/\s+/g, '-'),
                    message: `${pat.name}: "${match[0]}"`,
                    excerpt: line.trim()
                });
            }
        }
    });

    const emDashMatches = body.match(/—/g) || [];
    if (emDashMatches.length > MAX_EM_DASHES_PER_ARTICLE) {
        warnings.push({
            line: 1,
            rule: 'em-dash-limit',
            message: `Found ${emDashMatches.length} em dashes (recommended max: ${MAX_EM_DASHES_PER_ARTICLE})`,
            excerpt: ''
        });
    }

    return { errors, warnings };
}

const args = process.argv.slice(2);
const blogDir = path.resolve(process.cwd(), 'src/content/blog');
const files =
    args.length > 0
        ? args.map((f) => path.resolve(process.cwd(), f))
        : fs
              .readdirSync(blogDir)
              .filter((f) => f.endsWith('.md'))
              .sort()
              .map((f) => path.join(blogDir, f));

let totalErrors = 0;
let totalWarnings = 0;

for (const file of files) {
    const rel = path.relative(process.cwd(), file);
    const { errors, warnings } = lintFile(file);
    totalErrors += errors.length;
    totalWarnings += warnings.length;

    if (errors.length > 0 || warnings.length > 0) {
        console.log(`\n${rel}`);
        for (const err of errors) {
            console.log(`  ERROR [L${err.line}] (${err.rule}): ${err.message}`);
        }
        for (const warn of warnings) {
            console.log(`  WARN  [L${warn.line}] (${warn.rule}): ${warn.message}`);
        }
    }
}

console.log(`\nNo-AI-Slop Lint: ${files.length} file(s) checked — ${totalErrors} error(s), ${totalWarnings} warning(s).`);
if (totalErrors > 0) {
    process.exit(1);
}
