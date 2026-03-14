import 'dotenv/config'

import { createHash } from 'crypto'

import bcrypt from 'bcrypt'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from '../src/generated/prisma/client.js'

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const RAW_KEYS = {
  panicSource: 'ps-test-api-key-001',
  responder: 'rs-test-api-key-001',
}

function hashApiKey(raw: string) {
  return createHash('sha256').update(raw).digest('hex')
}

async function main() {
  const panicSource = await prisma.partner.upsert({
    where: { apiKeyHash: hashApiKey(RAW_KEYS.panicSource) },
    update: {},
    create: {
      name: 'Test Panic Source',
      type: 'PANIC_SOURCE',
      apiKeyHash: hashApiKey(RAW_KEYS.panicSource),
      webhookUrl: null,
    },
  })

  const responder = await prisma.partner.upsert({
    where: { apiKeyHash: hashApiKey(RAW_KEYS.responder) },
    update: {},
    create: {
      name: 'Test Responder System',
      type: 'RESPONDER_SYSTEM',
      apiKeyHash: hashApiKey(RAW_KEYS.responder),
      webhookUrl: 'http://localhost:4000/webhook',
    },
  })

  const passwordHash = await bcrypt.hash('Admin1234!', 10)
  const operator = await prisma.operator.upsert({
    where: { email: 'admin@oderply.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@oderply.com',
      passwordHash,
    },
  })

  console.log('Seeded:')
  console.log(' PANIC_SOURCE partner:', panicSource.id, '| key:', RAW_KEYS.panicSource)
  console.log(' RESPONDER_SYSTEM partner:', responder.id, '| key:', RAW_KEYS.responder)
  console.log(' Operator:', operator.id, '| email: admin@oderply.com | password: Admin1234!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => { void prisma.$disconnect() })
