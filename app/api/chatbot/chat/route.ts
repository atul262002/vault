import {  currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/db';


const openai = new OpenAI({ apiKey: process.env.OPENAI_APIKEY! });

const CLASSIFIER_SYSTEM = `
You are a dispute-classifier.
Classify incoming messages strictly as SIMPLE or COMPLEX.
• SIMPLE: basic FAQs, "Where's my refund?", account/status checks.
• COMPLEX: delivery issues, damaged/missing goods, multi-party negotiations.
Reply with exactly one word: SIMPLE or COMPLEX.
`.trim();

async function classifyMessage(text:any) {
    const resp = await openai.chat.completions.create({
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

        const body = await req.json()
        const message = body.message;
        const history = body.history || []
        const userId = dbUser.id;

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
                `• ${item.product.name} (Order ${p.id}, ${p.status} ${p.totalAmount} ${p.razorpayId})`
            ).join('\n')
        ).join('\n')}

Seller’s active listings with ${email} as email Address:
${listings.map(l => `• ${l.name} (Listing ${l.id}) Refund Period ${l.refundPeriod} Price ${l.price}`).join('\n')}
`.trim();

        const chat = await openai.chat.completions.create({
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
