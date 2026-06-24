import { io } from '../index'

export function emitToRole(role: string, event: string, data: unknown) {
  io.to(`role:${role}`).emit(event, data)
}

export function emitToAll(event: string, data: unknown) {
  io.emit(event, data)
}
