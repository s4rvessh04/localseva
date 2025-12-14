import { EventEmitter } from "node:events";

export const eventBus = new EventEmitter({
  captureRejections: true
});

eventBus.setMaxListeners(50);

export function emitEvent<T>(event: string, payload: T) {
  process.nextTick(() => {
    eventBus.emit(event, payload);
  });
}
