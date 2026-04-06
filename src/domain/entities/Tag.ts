export type Tag = {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

export type CreateTagInput = {
  id: string;
  name: string;
  color: string;
  usageCount: number;
  createdAt: number;
  updatedAt: number;
};

export function createTag(input: CreateTagInput): Tag {
  const name = input.name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!name) {
    throw new Error('Tag name is required');
  }
  return {
    id: input.id,
    name,
    color: input.color,
    usageCount: input.usageCount,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  };
}
