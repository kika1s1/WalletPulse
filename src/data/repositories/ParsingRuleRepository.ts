import type {Database} from '@nozbe/watermelondb';
import {Q} from '@nozbe/watermelondb';
import type {IParsingRuleRepository} from '@domain/repositories/IParsingRuleRepository';
import type {ParsingRule, CreateParsingRuleInput} from '@domain/entities/ParsingRule';
import type ParsingRuleModel from '@data/database/models/ParsingRuleModel';
import {toDomain} from '@data/mappers/parsing-rule-mapper';

export class ParsingRuleRepository implements IParsingRuleRepository {
  constructor(private db: Database) {}

  private toEntity(r: ParsingRuleModel): ParsingRule {
    return toDomain({
      id: r.id,
      sourceApp: r.sourceApp,
      packageName: r.packageName,
      ruleName: r.ruleName,
      pattern: r.pattern,
      transactionType: r.transactionType,
      isActive: r.isActive,
      priority: r.priority,
      createdAt: r.createdAt.getTime(),
      updatedAt: r.updatedAt.getTime(),
    });
  }

  async findAll(): Promise<ParsingRule[]> {
    const records = await this.db
      .get<ParsingRuleModel>('parsing_rules')
      .query()
      .fetch();
    return records.map((r) => this.toEntity(r));
  }

  async findByPackageName(packageName: string): Promise<ParsingRule[]> {
    const records = await this.db
      .get<ParsingRuleModel>('parsing_rules')
      .query(Q.where('package_name', packageName), Q.where('is_active', true))
      .fetch();
    return records
      .map((r) => this.toEntity(r))
      .sort((a, b) => b.priority - a.priority);
  }

  async create(input: CreateParsingRuleInput): Promise<void> {
    await this.db.write(async () => {
      await this.db
        .get<ParsingRuleModel>('parsing_rules')
        .create((rec) => {
          rec._raw.id = input.id;
          rec.sourceApp = input.sourceApp.trim();
          rec.packageName = input.packageName.trim();
          rec.ruleName = input.ruleName.trim();
          rec.pattern = input.pattern;
          rec.transactionType = input.transactionType;
          rec.isActive = input.isActive;
          rec.priority = input.priority;
        });
    });
  }

  async update(id: string, input: Partial<CreateParsingRuleInput>): Promise<void> {
    const record = await this.db
      .get<ParsingRuleModel>('parsing_rules')
      .find(id);
    await this.db.write(async () => {
      await record.update((rec) => {
        if (input.sourceApp !== undefined) rec.sourceApp = input.sourceApp.trim();
        if (input.packageName !== undefined) rec.packageName = input.packageName.trim();
        if (input.ruleName !== undefined) rec.ruleName = input.ruleName.trim();
        if (input.pattern !== undefined) rec.pattern = input.pattern;
        if (input.transactionType !== undefined) rec.transactionType = input.transactionType;
        if (input.isActive !== undefined) rec.isActive = input.isActive;
        if (input.priority !== undefined) rec.priority = input.priority;
      });
    });
  }

  async delete(id: string): Promise<void> {
    const record = await this.db
      .get<ParsingRuleModel>('parsing_rules')
      .find(id);
    await this.db.write(async () => {
      await record.markAsDeleted();
    });
  }
}
