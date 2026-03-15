import type { Server as HttpServer } from 'node:http'

import { Server } from 'socket.io'

let io: Server | null = null

export function attachGateway(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: '*' } })
  return io
}

export function getIo(): Server {
  if (!io) throw new Error('Socket.io gateway not initialised')
  return io
}
