import type {ParsingRule, CreateParsingRuleInput} from '@domain/entities/ParsingRule';

export type IParsingRuleRepository = {
  findAll(): Promise<ParsingRule[]>;
  findByPackageName(packageName: string): Promise<ParsingRule[]>;
  create(input: CreateParsingRuleInput): Promise<void>;
  update(id: string, input: Partial<CreateParsingRuleInput>): Promise<void>;
  delete(id: string): Promise<void>;
};
