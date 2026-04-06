import type {Tag} from '@domain/entities/Tag';

export interface ITagRepository {
  findAll(): Promise<Tag[]>;
  findByName(name: string): Promise<Tag | null>;
  save(tag: Tag): Promise<void>;
  delete(id: string): Promise<void>;
}
