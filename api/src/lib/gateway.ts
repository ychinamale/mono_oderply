import type { Server as HttpServer } from 'node:http'

import { Server } from 'socket.io'

let io: Server | null = null

export function attachGateway(httpServer: HttpServer): Server {
  io = new Server(httpServer, { cors: { origin: '*' } })
  // Clear reference when the server closes so tests don't share state
  httpServer.once('close', () => { io = null })
  return io
}

export function getIo(): Server | null {
  return io
}
