import type { Entity } from '../physics/types';

let nextEntityId: Entity = 1;

export const createEntityId = (): Entity => {
  const id = nextEntityId;
  nextEntityId += 1;
  return id;
};
