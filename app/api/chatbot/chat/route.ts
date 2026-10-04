import {  currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

const MAX_MESSAGE_CHARS = 1000;
const MAX_HISTORY_MESSAGES = 10;
const CHAT_LIMIT_PER_WINDOW = 20;
const CHAT_WINDOW_MS = 10 * 60 * 1000;


const getOpenAI = () => new OpenAI({ apiKey: process.env.OPENAI_APIKEY! });

const CLASSIFIER_SYSTEM = `
You are a dispute-classifier.
Classify incoming messages strictly as SIMPLE or COMPLEX.
• SIMPLE: basic FAQs, "Where's my refund?", account/status checks.
• COMPLEX: delivery issues, damaged/missing goods, multi-party negotiations.
Reply with exactly one word: SIMPLE or COMPLEX.
`.trim();

async function classifyMessage(text: string) {
    const resp = await getOpenAI().chat.completions.create({
        model: 'gpt-3.5-turbo',
        temperature: 0,
        messages: [
            { role: 'system', content: CLASSIFIER_SYSTEM },
            { role: 'user', content: text },
        ],
    });

    const label = resp?.choices[0]?.message?.content?.trim()?.toUpperCase();
    return label === 'COMPLEX' ? 'COMPLEX' : 'SIMPLE';
}

export async function POST(req: NextRequest) {
    if (req.method !== 'POST') {
        return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
    }

    try {
        const clerkUser = await currentUser();

        if (!clerkUser || !clerkUser.emailAddresses?.[0]?.emailAddress) {
            return NextResponse.json({ error: 'Unauthorized or missing email' }, { status: 404 });
        }

        const email = clerkUser.emailAddresses[0].emailAddress;

        const dbUser = await prisma.user.findUnique({
            where: { email },
        });

        if (!dbUser) {
            return NextResponse.json({ error: 'User not found in internal database' }, { status: 404 });
        }

        const userId = dbUser.id;

        // Each request costs OpenAI credits, so cap how often one user can ask.
        if (!rateLimit(`chatbot:${userId}`, CHAT_LIMIT_PER_WINDOW, CHAT_WINDOW_MS)) {
            return NextResponse.json({ error: 'Too many messages. Please wait a few minutes.' }, { status: 429 });
        }

        const body = await req.json().catch(() => null);
        const message = typeof body?.message === 'string' ? body.message.trim() : '';
        if (!message || message.length > MAX_MESSAGE_CHARS) {
            return NextResponse.json({ error: `Message must be 1-${MAX_MESSAGE_CHARS} characters` }, { status: 400 });
        }

        // Only plain user/assistant turns from the client are accepted. A
        // client-supplied "system" message could override our instructions,
        // and an unbounded history would run up token costs.
        const rawHistory: unknown[] = Array.isArray(body?.history) ? body.history : [];
        const history = rawHistory
            .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
                typeof m === 'object' && m !== null &&
                ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'assistant') &&
                typeof (m as { content?: unknown }).content === 'string')
            .slice(-MAX_HISTORY_MESSAGES)
            .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

        const purchases = await prisma.order.findMany({
            where: { buyerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                orderItems: {
                    include: { product: true },
                },
            },
        });

        const listings = await prisma.products.findMany({
            where: { sellerId: userId },
        });

        const label = await classifyMessage(message);
        const model = label === 'COMPLEX' ? 'gpt-4' : 'gpt-3.5-turbo';

        const systemPrompt = `
You are Vault’s dispute‑resolution assistant.

Buyer’s recent purchases:
${purchases.map(p =>
            p.orderItems.map(item =>
                `• ${item.product.name} (Order ${p.id}, ${p.status}, ₹${p.totalAmount})`
            ).join('\n')
        ).join('\n')}

Seller’s active listings :
${listings.map(l => `• ${l.name} (Listing ${l.id}) Refund Period ${l.refundPeriod} Price ${l.price}`).join('\n')}
`.trim();

        const chat = await getOpenAI().chat.completions.create({
            model,
            temperature: 0.7,
            max_tokens: 500,
            messages: [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message },
            ],
        });

        const reply = chat?.choices[0]?.message?.content?.trim();
        return NextResponse.json({ reply }, { status: 200 });

    } catch (error) {
        console.error('Chat error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
